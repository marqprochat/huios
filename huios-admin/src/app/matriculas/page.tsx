import prisma from '@/lib/prisma';
import { MatriculasClient } from './MatriculasClient';

export const dynamic = 'force-dynamic';

export default async function MatriculasPage() {
  const matriculas = await prisma.enrollment.findMany({
    include: {
      student: { select: { id: true, name: true, email: true } },
      class: { select: { id: true, name: true, course: { select: { name: true } } } },
      church: { select: { name: true, type: true } },
      financialTransactions: { select: { status: true } },
    } as any,
    orderBy: { createdAt: 'desc' },
  });

  return <MatriculasClient matriculas={matriculas as any} />;
}
