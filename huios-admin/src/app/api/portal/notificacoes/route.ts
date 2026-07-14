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

        const notifications = await prisma.studentNotification.findMany({
            where: { studentId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        const unreadCount = await prisma.studentNotification.count({
            where: { studentId, read: false }
        });

        return NextResponse.json({ notifications, unreadCount });
    } catch (error) {
        console.error('Portal notificacoes error:', error);
        return NextResponse.json({ error: 'Erro ao buscar notificações' }, { status: 500 });
    }
}
