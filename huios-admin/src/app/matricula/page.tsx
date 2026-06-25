import prisma from '@/lib/prisma';
import { MatriculaLanding, LandingTurma } from './MatriculaLanding';

export const dynamic = 'force-dynamic';

export async function getOpenTurmas(): Promise<LandingTurma[]> {
  const turmas = await prisma.courseClass.findMany({
    where: { enrollmentStatus: 'ABERTA' } as any,
    include: { course: { select: { name: true, description: true, imageUrl: true } } },
    orderBy: { name: 'asc' },
  });
  return (turmas as any[]).map(t => ({
    id: t.id,
    name: t.name,
    courseName: t.course?.name ?? '',
    courseDescription: t.course?.description ?? null,
    courseImageUrl: t.course?.imageUrl ?? null,
    startDate: t.startDate ? t.startDate.toISOString() : null,
    duration: t.duration ?? null,
  }));
}

export default async function MatriculaPublicaPage() {
  const turmas = await getOpenTurmas();
  return <MatriculaLanding turmas={turmas} />;
}
