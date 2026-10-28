import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions/server'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ disciplineId: string }> }
) {
    try {
        try {
            await requirePermission('avaliacoes.notificar');
        } catch {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
        }

        const { disciplineId } = await params;
        const body = await request.json().catch(() => ({}));
        const studentId: string | undefined = body?.studentId;

        const discipline = await prisma.discipline.findUnique({
            where: { id: disciplineId },
            include: {
                lessons: {
                    include: {
                        attendances: true
                    }
                },
                courseClasses: {
                    include: {
                        course: { select: { modality: true } },
                        enrollments: {
                            where: { status: { in: ['CURSANDO', 'APROVADO'] } },
                            include: { student: true }
                        }
                    }
                }
            }
        });

        if (!discipline) {
            return NextResponse.json({ error: 'Disciplina não encontrada' }, { status: 404 });
        }

        const now = new Date();
        const liberado = discipline.lessons.length > 0 && discipline.lessons.every(lesson => {
            const end = lesson.endTime ? new Date(lesson.endTime) : new Date(lesson.date);
            if (!lesson.endTime) {
                end.setHours(23, 59, 59, 999);
            }
            return now > end;
        });

        if (!liberado) {
            return NextResponse.json({ error: 'Avaliação ainda não liberada para esta disciplina' }, { status: 400 });
        }

        const studentsMap = new Map<string, { name: string; modality: string }>();
        for (const courseClass of discipline.courseClasses) {
            const modality = courseClass.course?.modality ?? 'POR_NOTA';
            for (const enrollment of courseClass.enrollments) {
                studentsMap.set(enrollment.studentId, { name: enrollment.student.name, modality });
            }
        }

        const submissions = await prisma.teacherEvaluationSubmission.findMany({
            where: { disciplineId, studentId: { in: [...studentsMap.keys()] } }
        });
        const submittedIds = new Set(submissions.map(s => s.studentId));

        let targetIds = [...studentsMap.keys()].filter(id => {
            if (submittedIds.has(id)) return false;

            const info = studentsMap.get(id);
            // Se modalidade for POR_PRESENCA e o aluno faltou a todas as aulas (zero presenças), não notificar
            if (info?.modality === 'POR_PRESENCA') {
                const presentCount = discipline.lessons.filter(lesson =>
                    lesson.attendances.some(att => att.studentId === id && att.status === 'PRESENT')
                ).length;
                if (presentCount === 0) return false;
            }

            return true;
        });

        if (studentId) {
            if (!targetIds.includes(studentId)) {
                return NextResponse.json({ error: 'Aluno não está pendente para esta disciplina' }, { status: 400 });
            }
            targetIds = [studentId];
        }

        if (targetIds.length === 0) {
            return NextResponse.json({ notified: 0 });
        }

        await prisma.studentNotification.createMany({
            data: targetIds.map(id => ({
                studentId: id,
                disciplineId,
                type: 'TEACHER_EVALUATION_REMINDER',
                title: 'Avalie seu professor!',
                message: `Sua avaliação do professor de ${discipline.name} está disponível — dê seu feedback!`
            }))
        });

        return NextResponse.json({ notified: targetIds.length });
    } catch (error) {
        console.error('Notify teacher evaluation error:', error);
        return NextResponse.json({ error: 'Erro ao notificar alunos' }, { status: 500 });
    }
}
