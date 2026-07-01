import Link from 'next/link';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
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
  // Aluno já logado no portal: pedir para fazer a matrícula por lá.
  const session = await getSession();
  if (session?.role === 'ALUNO') {
    return <AlunoLogadoPrompt />;
  }

  const turmas = await getOpenTurmas();
  return <MatriculaLanding turmas={turmas} />;
}

function AlunoLogadoPrompt() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-[480px] bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Huios" className="h-12 mx-auto mb-4 object-contain" />
        <div className="w-14 h-14 rounded-full bg-[#135bec]/10 text-[#135bec] flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-3xl">app_registration</span>
        </div>
        <h1 className="text-xl font-black text-slate-900">Você já é aluno</h1>
        <p className="text-sm text-slate-500 mt-2">
          Para se matricular em uma nova turma, use a área de matrículas dentro do seu portal.
        </p>
        <Link
          href="/portal/matricula"
          className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-[#135bec] text-white py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all"
        >
          Ir para o portal
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </Link>
      </div>
    </div>
  );
}
