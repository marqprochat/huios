import prisma from '@/lib/prisma';
import { CuponsClient } from './CuponsClient';

export const dynamic = 'force-dynamic';

export default async function CuponsPage() {
  const [coupons, courses, classes] = await Promise.all([
    (prisma as any).coupon.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.course.findMany({ where: { status: 'ACTIVE' }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.courseClass.findMany({
      select: { id: true, name: true, course: { select: { name: true } } },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <CuponsClient
      coupons={coupons}
      courses={courses as any}
      classes={(classes as any[]).map(c => ({ id: c.id, name: c.name, courseName: c.course?.name ?? '' }))}
    />
  );
}
