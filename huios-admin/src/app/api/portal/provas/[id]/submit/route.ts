import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        const { id: examId } = await params;

        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            include: { student: true }
        });

        if (!user?.student) {
            return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });
        }

        const studentId = user.student.id;

        // Check if already submitted
        const existing = await prisma.examSubmission.findUnique({
            where: {
                examId_studentId: { examId, studentId }
            }
        });

        if (existing?.submittedAt) {
            return NextResponse.json({ error: 'Prova já foi submetida' }, { status: 400 });
        }

        const body = await request.json();
        const { answers } = body; // Array of { questionId, alternativeId }

        // Get exam with questions to calculate score
        const exam = await prisma.exam.findUnique({
            where: { id: examId },
            include: {
                questions: {
                    include: {
                        alternatives: true
                    }
                }
            }
        });

        if (!exam) {
            return NextResponse.json({ error: 'Prova não encontrada' }, { status: 404 });
        }

        // Check if exam is still open
        const now = new Date();
        if (now < exam.startDate || now > exam.endDate) {
            return NextResponse.json({ error: 'Prova fora do período' }, { status: 400 });
        }

        // Create or update submission
        let submission = existing;
        if (!submission) {
            submission = await prisma.examSubmission.create({
                data: {
                    examId,
                    studentId,
                    startedAt: new Date()
                }
            });
        }

        // Calculate scores
        let totalScore = 0;
        let maxScore = 0;

        for (const answer of answers) {
            const question = exam.questions.find(q => q.id === answer.questionId);
            if (!question) continue;

            const selectedAlt = question.alternatives.find(a => a.id === answer.alternativeId);
            const isCorrect = selectedAlt?.isCorrect || false;
            const points = isCorrect ? question.weight : 0;

            totalScore += points;
            maxScore += question.weight;

            // Upsert answer
            await prisma.studentAnswer.upsert({
                where: {
                    submissionId_questionId: {
                        submissionId: submission.id,
                        questionId: answer.questionId
                    }
                },
                create: {
                    submissionId: submission.id,
                    questionId: answer.questionId,
                    alternativeId: answer.alternativeId,
                    isCorrect,
                    points
                },
                update: {
                    alternativeId: answer.alternativeId,
                    isCorrect,
                    points
                }
            });
        }

        // Finalize submission
        await prisma.examSubmission.update({
            where: { id: submission.id },
            data: {
                submittedAt: new Date(),
                score: totalScore,
                maxScore
            }
        });

        // Auto-create grade
        const gradeScore = maxScore > 0 ? (totalScore / maxScore) * 10 : 0;
        await prisma.grade.create({
            data: {
                studentId,
                disciplineId: exam.disciplineId,
                type: 'EXAM',
                examId: exam.id,
                score: Math.round(gradeScore * 10) / 10,
                weight: 1.0,
                title: exam.title,
                createdById: session.userId
            }
        });

        return NextResponse.json({
            success: true,
            score: totalScore,
            maxScore,
            gradeScore: Math.round(gradeScore * 10) / 10
        });
    } catch (error) {
        console.error('Submit exam error:', error);
        return NextResponse.json({ error: 'Erro ao submeter prova' }, { status: 500 });
    }
}
