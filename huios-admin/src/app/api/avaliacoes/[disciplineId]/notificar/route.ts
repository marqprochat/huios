import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ disciplineId: string }> }
) {
    try {
        const session = await getSession();
        if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'COORDENADOR')) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
        }

        const { disciplineId } = await params;
        const body = await request.json().catch(() => ({}));
        const studentId: string | undefined = body?.studentId;

        const discipline = await prisma.discipline.findUnique({
            where: { id: disciplineId },
            include: {
                lessons: true,
                courseClasses: {
                    include: {
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

        const studentsMap = new Map<string, string>();
        for (const courseClass of discipline.courseClasses) {
            for (const enrollment of courseClass.enrollments) {
                studentsMap.set(enrollment.studentId, enrollment.student.name);
            }
        }

        const submissions = await prisma.teacherEvaluationSubmission.findMany({
            where: { disciplineId, studentId: { in: [...studentsMap.keys()] } }
        });
        const submittedIds = new Set(submissions.map(s => s.studentId));

        let targetIds = [...studentsMap.keys()].filter(id => !submittedIds.has(id));

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
