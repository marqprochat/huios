import prisma from '@/lib/prisma';
import { MatriculaForm } from './MatriculaForm';

export const dynamic = 'force-dynamic';

async function getOpenTurmas() {
  const turmas = await prisma.courseClass.findMany({
    where: { enrollmentStatus: 'ABERTA' } as any,
    include: { course: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });
  return (turmas as any[]).map(t => ({
    id: t.id,
    name: t.name,
    courseName: t.course?.name ?? '',
    startDate: t.startDate ? t.startDate.toISOString() : null,
  }));
}

export default async function MatriculaPublicaPage() {
  const turmas = await getOpenTurmas();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-[640px]">
        <div className="text-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Huios" className="h-12 mx-auto mb-3 object-contain" />
          <h1 className="text-2xl font-black text-slate-900">Matrícula</h1>
          <p className="text-slate-500 text-sm">Seminário Teológico Huios</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
          <MatriculaForm turmas={turmas} />
        </div>
      </div>
    </div>
  );
}
