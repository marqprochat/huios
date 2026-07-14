import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const { id } = await params;

        const notification = await prisma.studentNotification.findUnique({ where: { id } });
        if (!notification || notification.studentId !== user.student.id) {
            return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
        }

        await prisma.studentNotification.update({
            where: { id },
            data: { read: true, readAt: new Date() }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Mark student notification read error:', error);
        return NextResponse.json({ error: 'Erro ao atualizar notificação' }, { status: 500 });
    }
}
