import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            include: { student: true }
        });

        if (!user?.student) {
            return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });
        }

        const lessonId = resolvedParams.id;
        const studentId = user.student.id;
        const body = await request.json();
        const { latitude, longitude, action = 'checkin' } = body;

        if (!latitude || !longitude) {
             return NextResponse.json({ error: 'Localização não fornecida' }, { status: 400 });
        }

        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            include: {
                disciplines: { include: { courseClasses: true } }
            }
        });

        if (!lesson) {
            return NextResponse.json({ error: 'Aula não encontrada' }, { status: 404 });
        }

        // Check if student is enrolled in the class of this lesson
        const lessonClassIds = lesson.disciplines.flatMap(d => d.courseClasses.map(cc => cc.id));
        const isEnrolled = await prisma.enrollment.findFirst({
            where: {
                 studentId: studentId,
                 classId: { in: lessonClassIds },
                 status: 'ACTIVE'
            }
        });

        if (!isEnrolled) {
             return NextResponse.json({ error: 'Aluno não matriculado nesta turma' }, { status: 403 });
        }

        // Check time limits
        const now = new Date();
        const start = lesson.startTime ? new Date(lesson.startTime) : null;
        const end = lesson.endTime ? new Date(lesson.endTime) : null;

        // Limites configuráveis. Por padrão, 30 minutos antes de começar e 30 minutos depois de terminar.
        // Lendo do arquivo json criado para segurar as configurações do buffer
        let bufferMinutes = 30; // fallback default
        try {
            const fs = require('fs');
            const path = require('path');
            const configPath = path.join(process.cwd(), 'checkin-config.json');
            if (fs.existsSync(configPath)) {
                const configRaw = fs.readFileSync(configPath, 'utf-8');
                const parsed = JSON.parse(configRaw);
                const globalConfig = Array.isArray(parsed) ? parsed.find(c => c.id === 'global') : parsed;
                if (globalConfig && globalConfig.checkInBufferMinutes) {
                    bufferMinutes = globalConfig.checkInBufferMinutes;
                }
            }
        } catch (e) {
            console.error("Could not read checkin config, using default 30 min", e);
        }

        const earlyBuffer = bufferMinutes * 60 * 1000;
        const lateBuffer = bufferMinutes * 60 * 1000;

        if (start && end) {
            if (action === 'checkin') {
                const checkInStart = new Date(start.getTime() - earlyBuffer);
                const checkInEnd = new Date(start.getTime() + lateBuffer);

                if (now < checkInStart) {
                    return NextResponse.json({ 
                        error: `Check-in não permitido ainda. Horário de check-in inicia às ${checkInStart.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}.` 
                    }, { status: 400 });
                }

                if (now > checkInEnd) {
                     return NextResponse.json({ 
                        error: `Passou do horário de check-in. O prazo era até as ${checkInEnd.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}.` 
                    }, { status: 400 });
                }
            } else if (action === 'checkout') {
                // Checkout permitted after lesson finishes, or perhaps slightly before. Let's say right at end time and up to lateBuffer after that
                const checkOutStart = new Date(end.getTime());
                const checkOutEnd = new Date(end.getTime() + lateBuffer);

                if (now < checkOutStart) {
                     return NextResponse.json({ 
                        error: `A aula ainda não terminou. O check-out só é permitido após as ${checkOutStart.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}.` 
                    }, { status: 400 });
                }

                if (now > checkOutEnd) {
                     return NextResponse.json({ 
                        error: `Tempo de check-out esgotado. Era apenas até as ${checkOutEnd.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}.` 
                    }, { status: 400 });
                }
            }
        }

        if (!lesson.latitude || !lesson.longitude) {
            return NextResponse.json({ error: 'Aula não possui localização definida. Procure a secretaria.' }, { status: 400 });
        }

        // Calculate distance
        const distance = calculateDistance(
            lesson.latitude,
            lesson.longitude,
            parseFloat(latitude),
            parseFloat(longitude)
        );

        // Check if within radius
        const isWithinRadius = distance <= lesson.radiusMeters;

        if (!isWithinRadius) {
             return NextResponse.json({ 
                error: `Você está fora do local da aula. Aproxime-se e tente novamente. Tolerância: ${lesson.radiusMeters}m.` 
            }, { status: 400 });
        }

        // Create or update attendance based on action
        let attendance;
        
        if (action === 'checkin') {
            attendance = await prisma.attendance.upsert({
                where: {
                    lessonId_studentId: {
                        lessonId,
                        studentId
                    }
                },
                update: {
                    status: 'PRESENT',
                    checkInAt: new Date(),
                    checkInLat: parseFloat(latitude),
                    checkInLong: parseFloat(longitude),
                    distance: Math.round(distance)
                },
                create: {
                    lessonId,
                    studentId,
                    status: 'PRESENT',
                    checkInAt: new Date(),
                    checkInLat: parseFloat(latitude),
                    checkInLong: parseFloat(longitude),
                    distance: Math.round(distance)
                }
            });
        } else {
            // Check-out
            // Must have check-in first to checkout usually, but let's just make it update or create just in case.
            // A more robust system would require a previous check-in.
            const existing = await prisma.attendance.findUnique({
                where: { lessonId_studentId: { lessonId, studentId } }
            });

            if (!existing || !existing.checkInAt) {
                return NextResponse.json({ error: 'Você não fez check-in nesta aula para poder fazer check-out.' }, { status: 400 });
            }

            attendance = await prisma.attendance.update({
                where: { lessonId_studentId: { lessonId, studentId } },
                data: {
                    checkOutAt: new Date(),
                    checkOutLat: parseFloat(latitude),
                    checkOutLong: parseFloat(longitude),
                    checkOutDistance: Math.round(distance)
                }
            });
        }

        return NextResponse.json({
            attendance,
            distance: Math.round(distance),
            isWithinRadius: true,
            message: action === 'checkin' ? 'Check-in realizado com sucesso!' : 'Check-out realizado com sucesso!'
        });

    } catch (error) {
        console.error('Portal checkin error:', error);
        return NextResponse.json({ error: 'Erro interno ao realizar registro de presença' }, { status: 500 });
    }
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}
