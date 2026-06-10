import prisma from '@/lib/prisma';
import { FinanceiroDashboardClient } from './FinanceiroDashboardClient';

export default async function FinanceiroPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const next7Days = new Date(now);
  next7Days.setDate(now.getDate() + 7);

  const [
    totalReceita,
    totalDespesa,
    vencidos,
    recebidoMes,
    pagoMes,
    upcoming,
    monthlyData,
  ] = await Promise.all([
    (prisma as any).financialTransaction.aggregate({
      _sum: { amount: true },
      where: { type: 'RECEITA', status: { in: ['PENDENTE', 'VENCIDO'] } },
    }),
    (prisma as any).financialTransaction.aggregate({
      _sum: { amount: true },
      where: { type: 'DESPESA', status: { in: ['PENDENTE', 'VENCIDO'] } },
    }),
    (prisma as any).financialTransaction.count({
      where: { status: 'VENCIDO' },
    }),
    (prisma as any).financialTransaction.aggregate({
      _sum: { amount: true },
      where: { type: 'RECEITA', status: 'PAGO', paidAt: { gte: startOfMonth, lte: endOfMonth } },
    }),
    (prisma as any).financialTransaction.aggregate({
      _sum: { amount: true },
      where: { type: 'DESPESA', status: 'PAGO', paidAt: { gte: startOfMonth, lte: endOfMonth } },
    }),
    (prisma as any).financialTransaction.findMany({
      where: {
        status: { in: ['PENDENTE', 'VENCIDO'] },
        dueDate: { lte: next7Days },
      },
      include: {
        category: true,
        student: { select: { name: true } },
        teacher: { select: { name: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
    }),
    // last 6 months aggregated
    (prisma as any).financialTransaction.findMany({
      where: {
        dueDate: {
          gte: new Date(now.getFullYear(), now.getMonth() - 5, 1),
        },
        status: { in: ['PENDENTE', 'PAGO', 'VENCIDO'] },
      },
      select: { type: true, amount: true, dueDate: true, status: true },
    }),
  ]);

  // Build monthly chart data
  const months: { label: string; key: string; receita: number; despesa: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    months.push({ label, key, receita: 0, despesa: 0 });
  }

  for (const tx of monthlyData) {
    const d = new Date(tx.dueDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const m = months.find(m => m.key === key);
    if (m) {
      if (tx.type === 'RECEITA') m.receita += tx.amount;
      else m.despesa += tx.amount;
    }
  }

  const kpis = {
    totalReceita: totalReceita._sum.amount ?? 0,
    totalDespesa: totalDespesa._sum.amount ?? 0,
    vencidos,
    recebidoMes: recebidoMes._sum.amount ?? 0,
    pagoMes: pagoMes._sum.amount ?? 0,
  };

  return <FinanceiroDashboardClient kpis={kpis} upcoming={upcoming} months={months} />;
}
