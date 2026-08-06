import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { studentExamWhere } from './exam-access'

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

        const exams = await prisma.exam.findMany({
            where: studentExamWhere(studentId),
            include: {
                discipline: {
                    include: {
                        courseClasses: true
                    }
                },
                questions: {
                    include: {
                        alternatives: true
                    },
                    orderBy: { order: 'asc' }
                },
                submissions: {
                    where: { studentId }
                }
            },
            orderBy: { startDate: 'desc' }
        });

        return NextResponse.json(exams);
    } catch (error) {
        console.error('Portal provas error:', error);
        return NextResponse.json({ error: 'Erro ao carregar provas' }, { status: 500 });
    }
}
