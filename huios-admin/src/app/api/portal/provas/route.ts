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

        // Get enrolled class IDs
        const enrollments = await prisma.enrollment.findMany({
            where: { studentId, status: 'ACTIVE' },
            select: { classId: true }
        });

        const classIds = enrollments.map(e => e.classId);

        // Get disciplines (N:N)
        const disciplines = await prisma.discipline.findMany({
            where: { courseClasses: { some: { id: { in: classIds } } } },
            select: { id: true }
        });

        const disciplineIds = disciplines.map(d => d.id);

        // Get published exams for those disciplines
        const exams = await prisma.exam.findMany({
            where: {
                disciplineId: { in: disciplineIds },
                isPublished: true
            },
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
