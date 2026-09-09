import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { formatDateBR } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const statusLabel: Record<string, string> = {
  PENDENTE: 'Pagamento pendente', CONFIRMADA: 'Confirmada', CANCELADA: 'Cancelada', EXPIRADA: 'Expirada (vaga liberada)',
};

export default async function ComprovanteInscricaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const registration = await (prisma as any).eventRegistration.findUnique({
    where: { id },
    include: { event: { select: { title: true, date: true } }, ticket: { select: { name: true } } },
  });
  if (!registration) notFound();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-4xl">confirmation_number</span>
        </div>
        <h1 className="text-xl font-black text-slate-900">{registration.event.title}</h1>
        <p className="text-slate-500 text-sm">{formatDateBR(registration.event.date)} · {registration.ticket.name}</p>
        <p className="text-2xl font-black text-slate-900">{registration.amount > 0 ? fmtBRL(registration.amount) : 'Gratuito'}</p>
        <p className="text-sm font-bold uppercase text-primary">{statusLabel[registration.status] || registration.status}</p>
        {registration.status === 'PENDENTE' && (
          <Link href={`/matricula/pagamento/${registration.transactionId}`} className="inline-flex w-full items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all">
            Ir para o pagamento
          </Link>
        )}
        <p className="text-xs text-slate-400">Código da inscrição: {registration.id}</p>
      </div>
    </div>
  );
}
