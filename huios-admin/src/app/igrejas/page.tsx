import prisma from '@/lib/prisma';
import { IgrejasClient } from './IgrejasClient';

export const dynamic = 'force-dynamic';

export default async function IgrejasPage() {
  const churches = await (prisma as any).church.findMany({
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  });

  // Contagem de matrículas por igreja (para exibir no card).
  const counts = await prisma.enrollment.groupBy({
    by: ['churchId'] as any,
    _count: { _all: true },
  } as any).catch(() => [] as any[]);

  const countMap: Record<string, number> = {};
  for (const c of counts as any[]) {
    if (c.churchId) countMap[c.churchId] = c._count._all;
  }

  const data = (churches as any[]).map(ch => ({ ...ch, enrollmentCount: countMap[ch.id] ?? 0 }));

  return <IgrejasClient churches={data} />;
}
