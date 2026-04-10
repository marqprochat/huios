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
                discipline: {
                    include: {
                        courseClass: true
                    }
                }
            }
        });

        if (!lesson) {
            return NextResponse.json({ error: 'Aula não encontrada' }, { status: 404 });
        }

        return NextResponse.json(lesson);
    } catch (error) {
        console.error('Portal lesson error:', error);
        return NextResponse.json({ error: 'Erro interno ao carregar a aula' }, { status: 500 });
    }
}
