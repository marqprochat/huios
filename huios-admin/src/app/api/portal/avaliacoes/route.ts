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

        // Get student's disciplines from all their enrollments
        // We consider all enrollments (CURSANDO, APROVADO, etc.) or just CURSANDO?
        // Usually, if they finished the class, status might stay CURSANDO until grades are out,
        // or change to APROVADO. Let's include both.
        const enrollments = await prisma.enrollment.findMany({
            where: { 
                studentId, 
                status: { in: ['CURSANDO', 'APROVADO'] } 
            },
            include: {
                class: {
                    include: {
                        disciplines: {
                            include: {
                                teacher: true,
                                lessons: true
                            }
                        }
                    }
                }
            }
        });

        const now = new Date();
        const availableEvaluations = [];
        const processedDisciplineIds = new Set<string>();

        for (const enrollment of enrollments) {
            for (const discipline of enrollment.class.disciplines) {
                if (processedDisciplineIds.has(discipline.id)) continue;
                processedDisciplineIds.add(discipline.id);

                // Check if already evaluated
                const alreadyEvaluated = await prisma.teacherEvaluationSubmission.findUnique({
                    where: {
                        studentId_disciplineId: {
                            studentId,
                            disciplineId: discipline.id
                        }
                    }
                });

                if (alreadyEvaluated) continue;

                // Check if all lessons have ended
                if (discipline.lessons.length === 0) continue;

                const allLessonsEnded = discipline.lessons.every(lesson => {
                    // Use endTime if available, otherwise just the date (assume end of day)
                    const end = lesson.endTime ? new Date(lesson.endTime) : new Date(lesson.date);
                    if (!lesson.endTime) {
                        end.setHours(23, 59, 59, 999);
                    }
                    return now > end;
                });

                if (allLessonsEnded) {
                    availableEvaluations.push({
                        id: discipline.id,
                        name: discipline.name,
                        teacher: discipline.teacher?.name || 'Não definido',
                    });
                }
            }
        }

        return NextResponse.json(availableEvaluations);
    } catch (error) {
        console.error('Portal evaluations error:', error);
        return NextResponse.json({ error: 'Erro ao carregar avaliações' }, { status: 500 });
    }
}
