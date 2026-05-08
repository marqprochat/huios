import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ disciplineId: string }> }
) {
    try {
        const { disciplineId } = await params;
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
        const body = await request.json();
        const { clarity, engagement, mastery, observations } = body;

        // Validation
        if (!clarity || !engagement || !mastery) {
            return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
        }

        // Check if already evaluated
        const alreadyEvaluated = await prisma.teacherEvaluationSubmission.findUnique({
            where: {
                studentId_disciplineId: {
                    studentId,
                    disciplineId
                }
            }
        });

        if (alreadyEvaluated) {
            return NextResponse.json({ error: 'Você já avaliou este professor para esta disciplina' }, { status: 400 });
        }

        // Transaction to ensure both record evaluation and track submission
        await prisma.$transaction([
            prisma.teacherEvaluation.create({
                data: {
                    disciplineId,
                    clarity,
                    engagement,
                    mastery,
                    observations
                }
            }),
            prisma.teacherEvaluationSubmission.create({
                data: {
                    studentId,
                    disciplineId
                }
            })
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Portal evaluation submit error:', error);
        return NextResponse.json({ error: 'Erro ao enviar avaliação' }, { status: 500 });
    }
}
