import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(
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

        const lesson = await prisma.lesson.findUnique({
            where: { id: resolvedParams.id },
            include: {
                disciplines: {
                    include: {
                        courseClasses: true
                    }
                },
                attendances: {
                    where: { studentId: user.student.id }
                }
            }
        });

        if (!lesson) {
            return NextResponse.json({ error: 'Aula não encontrada' }, { status: 404 });
        }

        // Compatibilidade: Encontrar a disciplina correta para o aluno
        const studentEnrollments = await prisma.enrollment.findMany({
            where: { studentId: user.student.id, status: 'ACTIVE' },
            select: { classId: true }
        });
        const classIds = studentEnrollments.map(e => e.classId);
        
        const relevantDiscipline = lesson.disciplines.find(d => 
            d.courseClasses.some(cc => classIds.includes(cc.id))
        ) || lesson.disciplines[0];

        return NextResponse.json({
            ...lesson,
            discipline: relevantDiscipline,
            disciplines: undefined // Opcional: remover o array original para economizar banda
        });
    } catch (error) {
        console.error('Portal lesson error:', error);
        return NextResponse.json({ error: 'Erro interno ao carregar a aula' }, { status: 500 });
    }
}
