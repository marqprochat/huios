import prisma from '@/lib/prisma';
import { PrecosCursosClient } from './PrecosCursosClient';

export default async function PrecosCursosPage() {
  const courses = await prisma.course.findMany({
    where: { status: 'ACTIVE' },
    include: { coursePrice: true },
    orderBy: { name: 'asc' },
  });

  return <PrecosCursosClient courses={courses as any} />;
}
