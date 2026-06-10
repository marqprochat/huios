import prisma from '@/lib/prisma';
import { ContasReceberClient } from './ContasReceberClient';

export default async function ContasReceberPage() {
  const [transactions, categories, students] = await Promise.all([
    (prisma as any).financialTransaction.findMany({
      where: { type: 'RECEITA' },
      include: {
        category: true,
        student: { select: { id: true, name: true } },
        enrollment: { include: { class: { include: { course: true } } } },
      },
      orderBy: { dueDate: 'asc' },
    }),
    (prisma as any).financialCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.student.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return <ContasReceberClient transactions={transactions} categories={categories} students={students as any} />;
}
