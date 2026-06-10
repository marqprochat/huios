import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  const dateFilter: any = {};
  if (start) {
    const [y, m] = start.split('-').map(Number);
    dateFilter.gte = new Date(y, m - 1, 1);
  }
  if (end) {
    const [y, m] = end.split('-').map(Number);
    dateFilter.lte = new Date(y, m, 0, 23, 59, 59);
  }

  const where: any = {};
  if (dateFilter.gte || dateFilter.lte) where.dueDate = dateFilter;

  try {
    const transactions = await (prisma as any).financialTransaction.findMany({
      where,
      include: {
        category: { select: { name: true, type: true } },
        student: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    // 1. Monthly summary
    const monthMap: Record<string, { receita: number; despesa: number }> = {};
    for (const tx of transactions) {
      if (!['PENDENTE', 'PAGO', 'VENCIDO'].includes(tx.status)) continue;
      const d = new Date(tx.dueDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = { receita: 0, despesa: 0 };
      if (tx.type === 'RECEITA') monthMap[key].receita += tx.amount;
      else monthMap[key].despesa += tx.amount;
    }

    const monthly = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => {
        const [y, m] = key.split('-');
        const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        return { month: label, receita: v.receita, despesa: v.despesa, saldo: v.receita - v.despesa };
      });

    // 2. Defaulters
    const now = new Date();
    const defaulters = transactions
      .filter((tx: any) => tx.type === 'RECEITA' && tx.status === 'VENCIDO' && tx.student)
      .map((tx: any) => ({
        studentName: tx.student.name,
        studentId: tx.student.id,
        description: tx.description,
        amount: tx.amount,
        dueDate: tx.dueDate.toISOString(),
        daysOverdue: Math.floor((now.getTime() - new Date(tx.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
      }))
      .sort((a: any, b: any) => b.daysOverdue - a.daysOverdue);

    // 3. By category
    const catMap: Record<string, { total: number; type: string }> = {};
    for (const tx of transactions) {
      if (!['PENDENTE', 'PAGO', 'VENCIDO'].includes(tx.status)) continue;
      const catName = tx.category?.name ?? 'Sem Categoria';
      const key = `${catName}|${tx.type}`;
      if (!catMap[key]) catMap[key] = { total: 0, type: tx.type };
      catMap[key].total += tx.amount;
    }

    const byCategory = Object.entries(catMap)
      .map(([key, v]) => ({
        category: key.split('|')[0],
        type: v.type,
        total: v.total,
      }))
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({ monthly, defaulters, byCategory });
  } catch (error: any) {
    console.error('Error in financial reports:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
