import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
    try {
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

        const studentId = user.student.id;

        const enrollments = await prisma.enrollment.findMany({
            where: { studentId, status: 'CURSANDO' },
            select: {
                classId: true,
                class: { select: { course: { select: { modality: true } } } }
            }
        });

        const classIds = enrollments.map(e => e.classId);

        // Map classId → modality for quick lookup
        const classModality: Record<string, string> = {};
        for (const e of enrollments) {
            classModality[e.classId] = (e.class.course as any).modality ?? 'POR_NOTA';
        }

        const disciplines = await prisma.discipline.findMany({
            where: { courseClasses: { some: { id: { in: classIds } } } },
            include: {
                courseClasses: {
                    where: { id: { in: classIds } },
                    include: { course: { select: { name: true, modality: true } } }
                },
                teacher: true,
                grades: { where: { studentId } },
                lessons: {
                    select: {
                        id: true,
                        attendances: {
                            where: { studentId },
                            select: { status: true }
                        }
                    }
                }
            }
        });

        // Enrich each discipline with modality and attendance summary
        const enriched = disciplines.map(disc => {
            const modality = disc.courseClasses[0]?.course?.modality ?? 'POR_NOTA';

            const attendance = disc.lessons.reduce(
                (acc, lesson) => {
                    const a = lesson.attendances[0];
                    if (!a) return acc;
                    if (a.status === 'PRESENT') acc.present++;
                    else if (a.status === 'ABSENT') acc.absent++;
                    else if (a.status === 'EXCUSED') acc.excused++;
                    else acc.pending++;
                    return acc;
                },
                { present: 0, absent: 0, excused: 0, pending: 0, total: disc.lessons.length }
            );

            // Remove lesson details from response (not needed by client)
            const { lessons: _, ...discWithoutLessons } = disc;
            return { ...discWithoutLessons, modality, attendance };
        });

        const grades = await prisma.grade.findMany({
            where: { studentId },
            include: {
                discipline: {
                    include: {
                        courseClasses: { include: { course: true } },
                        teacher: true
                    }
                },
                exam: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ grades, disciplines: enriched });
    } catch (error) {
        console.error('Portal boletim error:', error);
        return NextResponse.json({ error: 'Erro ao carregar boletim' }, { status: 500 });
    }
}
