import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { requirePageAccess } from '@/lib/permissions/page-guard';
import InscritosClient from './InscritosClient';

export const dynamic = 'force-dynamic';

export default async function InscritosPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageAccess('eventos.visualizar');
  const { id } = await params;

  const evento = await (prisma as any).event.findUnique({
    where: { id },
    include: {
      customFields: { orderBy: { order: 'asc' } },
      registrations: {
        include: {
          ticket: { select: { name: true } },
          student: { select: { cpf: true, birthDate: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!evento) notFound();

  return (
    <div className="mx-auto max-w-[1200px] p-4 lg:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/eventos" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Inscritos</h2>
          <p className="text-slate-500 dark:text-slate-400">{evento.title}</p>
        </div>
      </div>

      <InscritosClient
        eventTitle={evento.title}
        customFields={evento.customFields.map((f: any) => ({ id: f.id, label: f.label }))}
        registrations={evento.registrations.map((r: any) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          phone: r.phone,
          cpf: r.cpf || r.student?.cpf || '',
          birthDate: r.student?.birthDate ? r.student.birthDate.toISOString() : null,
          isStudent: r.isStudent,
          ticketName: r.ticket.name,
          amount: r.amount,
          status: r.status,
          answers: r.answers ?? {},
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
