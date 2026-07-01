import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { MatriculaForm } from '../../MatriculaForm';

export const dynamic = 'force-dynamic';

export default async function MatriculaTurmaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ church?: string }>;
}) {
  const { id } = await params;
  const { church: churchSlug } = await searchParams;

  // Aluno já logado: encaminha para a matrícula dentro do portal.
  const session = await getSession();
  if (session?.role === 'ALUNO') redirect('/portal/matricula');

  const turma = await prisma.courseClass.findUnique({
    where: { id },
    include: { course: { select: { name: true } } },
  });
  if (!turma || (turma as any).enrollmentStatus !== 'ABERTA') notFound();

  let church: { id: string; name: string; isPartner: boolean; type: string } | null = null;
  if (churchSlug) {
    const c = await (prisma as any).church.findUnique({ where: { publicSlug: churchSlug } });
    if (c && c.isActive) church = { id: c.id, name: c.name, isPartner: c.isPartner, type: c.type };
  }

  const backHref = churchSlug ? `/matricula/${churchSlug}` : '/matricula';

  const turmaData = [{
    id: turma.id,
    name: turma.name,
    courseName: (turma as any).course?.name ?? '',
    startDate: turma.startDate ? turma.startDate.toISOString() : null,
  }];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-[640px]">
        <div className="mb-4">
          <Link href={backHref} className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Voltar para as turmas
          </Link>
        </div>
        <div className="text-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Huios" className="h-12 mx-auto mb-3 object-contain" />
          <h1 className="text-2xl font-black text-slate-900">Matrícula</h1>
          <p className="text-slate-500 text-sm">Seminário Teológico Huios</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
          <MatriculaForm turmas={turmaData} church={church} />
        </div>
      </div>
    </div>
  );
}
