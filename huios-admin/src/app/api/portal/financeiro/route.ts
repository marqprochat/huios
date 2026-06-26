import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { student: { select: { id: true } } },
    });
    if (!user?.student) return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });

    const txs = await (prisma as any).financialTransaction.findMany({
      where: { studentId: user.student.id, type: 'RECEITA' },
      include: {
        category: { select: { name: true } },
        enrollment: { select: { class: { select: { name: true, course: { select: { name: true } } } } } },
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });

    const now = new Date();
    const items = (txs as any[]).map(t => {
      const overdue = t.status === 'PENDENTE' && new Date(t.dueDate) < now;
      return {
        id: t.id,
        description: t.description,
        amount: t.amount,
        status: t.status, // PENDENTE, PAGO, VENCIDO, CANCELADO, ISENTO
        overdue,
        dueDate: t.dueDate,
        paidAt: t.paidAt,
        paymentMethod: t.paymentMethod,
        category: t.category?.name ?? null,
        courseName: t.enrollment?.class?.course?.name ?? null,
        className: t.enrollment?.class?.name ?? null,
        payable: t.status === 'PENDENTE' || t.status === 'VENCIDO',
      };
    });

    const pendentes = items.filter(i => i.payable);
    const summary = {
      pendingCount: pendentes.length,
      overdueCount: items.filter(i => i.overdue).length,
      pendingTotal: pendentes.reduce((s, i) => s + i.amount, 0),
      paidTotal: items.filter(i => i.status === 'PAGO').reduce((s, i) => s + i.amount, 0),
    };

    return NextResponse.json({ items, summary });
  } catch (error: any) {
    console.error('Portal financeiro error:', error);
    return NextResponse.json({ error: 'Erro ao carregar financeiro' }, { status: 500 });
  }
}
