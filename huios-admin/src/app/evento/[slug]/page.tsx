import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { formatDateBR, formatInstantTimeBR } from '@/lib/date-utils';
import { getSession } from '@/lib/auth';
import { isRegistrationOpen, isTicketAvailable, applicablePrice, countOccupiedSlots } from '@/lib/events';

export const dynamic = 'force-dynamic';

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function EventoDetalhePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const now = new Date();

  const evento = await (prisma as any).event.findFirst({
    where: { publicSlug: slug, isPublished: true, registrationEnabled: true },
    include: { tickets: { orderBy: { order: 'asc' } }, registrations: { select: { status: true, reservedUntil: true, ticketId: true } } },
  });
  if (!evento) notFound();

  const session = await getSession();
  const isStudent = session?.role === 'ALUNO';

  const totalOccupied = countOccupiedSlots(evento.registrations, now);
  const ticketsWithAvailability = evento.tickets.map((t: any) => {
    const ticketRegs = evento.registrations.filter((r: any) => r.ticketId === t.id);
    const occupied = countOccupiedSlots(ticketRegs, now);
    return { ...t, available: isTicketAvailable(t, { now, isStudent, occupied }) };
  });
  const hasAvailableTicket = ticketsWithAvailability.some((t: any) => t.available);
  const registrationOpen = isRegistrationOpen(evento, { now, totalOccupied, hasAvailableTicket });

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/evento" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Voltar para eventos
        </Link>
        {evento.bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={evento.bannerUrl} alt={evento.title} className="w-full h-56 object-cover rounded-2xl" />
        )}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900">{evento.title}</h1>
            <p className="text-slate-500 text-sm mt-1">
              {formatDateBR(evento.date)}
              {evento.startTime ? ` · ${formatInstantTimeBR(evento.startTime)}${evento.endTime ? ` às ${formatInstantTimeBR(evento.endTime)}` : ''}` : ''}
            </p>
            {evento.locationAddress && <p className="text-slate-500 text-sm">{evento.locationAddress}</p>}
            {evento.mapUrl && <a href={evento.mapUrl} target="_blank" className="text-primary text-sm hover:underline">Ver no mapa</a>}
          </div>

          {evento.description && <p className="text-slate-700 text-sm leading-relaxed">{evento.description}</p>}

          {(evento.meetingPoint || evento.transportInfo) && (
            <div className="border-t border-slate-100 pt-4 space-y-1">
              <h3 className="text-sm font-bold text-slate-800">Logística</h3>
              {evento.meetingPoint && <p className="text-sm text-slate-600">Ponto de encontro: {evento.meetingPoint}</p>}
              {evento.meetingTime && <p className="text-sm text-slate-600">Horário de encontro: {formatInstantTimeBR(evento.meetingTime)}</p>}
              {evento.returnTime && <p className="text-sm text-slate-600">Previsão de retorno: {formatInstantTimeBR(evento.returnTime)}</p>}
              {evento.transportInfo && <p className="text-sm text-slate-600">{evento.transportInfo}</p>}
            </div>
          )}

          {evento.includedItems && (
            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-sm font-bold text-slate-800 mb-1">O que está incluso</h3>
              <p className="text-sm text-slate-600 whitespace-pre-line">{evento.includedItems}</p>
            </div>
          )}
          {evento.whatToBring && (
            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-sm font-bold text-slate-800 mb-1">O que levar</h3>
              <p className="text-sm text-slate-600 whitespace-pre-line">{evento.whatToBring}</p>
            </div>
          )}
          {evento.extraNotes && (
            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-sm font-bold text-slate-800 mb-1">Observações</h3>
              <p className="text-sm text-slate-600 whitespace-pre-line">{evento.extraNotes}</p>
            </div>
          )}
          {(evento.organizerName || evento.cancellationPolicy) && (
            <div className="border-t border-slate-100 pt-4 space-y-1">
              {evento.organizerName && <p className="text-sm text-slate-600">Organização: {evento.organizerName}{evento.organizerPhone ? ` · ${evento.organizerPhone}` : ''}</p>}
              {evento.cancellationPolicy && <p className="text-sm text-slate-500 italic">{evento.cancellationPolicy}</p>}
            </div>
          )}

          <div className="border-t border-slate-100 pt-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-800">Lotes</h3>
            {!registrationOpen && <p className="text-sm text-slate-500">As inscrições para este evento não estão abertas no momento.</p>}
            {registrationOpen && ticketsWithAvailability.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                <div>
                  <p className="font-bold text-slate-900">{t.name}</p>
                  <p className="text-sm text-slate-500">{fmtBRL(applicablePrice(t, isStudent))}{isStudent ? ' (aluno)' : ''}</p>
                </div>
                {t.available ? (
                  <Link href={`/evento/${slug}/inscricao?ticket=${t.id}`} className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-all">
                    Inscrever-se
                  </Link>
                ) : (
                  <span className="text-xs font-bold uppercase text-slate-400">Esgotado</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
