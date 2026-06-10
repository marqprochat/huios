import prisma from '@/lib/prisma';
import { ContasPagarClient } from './ContasPagarClient';

export default async function ContasPagarPage() {
  const [transactions, categories, teachers] = await Promise.all([
    (prisma as any).financialTransaction.findMany({
      where: { type: 'DESPESA' },
      include: {
        category: true,
        teacher: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    }),
    (prisma as any).financialCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.teacher.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return <ContasPagarClient transactions={transactions} categories={categories} teachers={teachers as any} />;
}
