import Link from 'next/link';
import prisma from '@/lib/prisma';
import { formatDateBR } from '@/lib/date-utils';
import { isRegistrationOpen, countOccupiedSlots } from '@/lib/events';

export const dynamic = 'force-dynamic';

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function EventoVitrinePage() {
  const now = new Date();
  const eventos = await (prisma as any).event.findMany({
    where: { isPublished: true, registrationEnabled: true, publicSlug: { not: null } },
    include: { tickets: true, registrations: { select: { status: true, reservedUntil: true } } },
    orderBy: { date: 'asc' },
  });

  const abertos = eventos.filter((evento: any) => {
    const totalOccupied = countOccupiedSlots(evento.registrations, now);
    const hasAvailableTicket = evento.tickets.some((t: any) =>
      t.isActive && (!t.salesEnd || t.salesEnd >= now) && (!t.salesStart || t.salesStart <= now));
    return isRegistrationOpen(evento, { now, totalOccupied, hasAvailableTicket });
  });

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Huios" className="h-12 mx-auto mb-3 object-contain" />
          <h1 className="text-2xl font-black text-slate-900">Eventos</h1>
          <p className="text-slate-500 text-sm">Excursões e eventos extras do Seminário Huios</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {abertos.map((evento: any) => {
            const menorPreco = Math.min(...evento.tickets.map((t: any) => Math.min(t.priceStudent, t.priceGeneral)));
            return (
              <Link key={evento.id} href={`/evento/${evento.publicSlug}`} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-all">
                {evento.bannerUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={evento.bannerUrl} alt={evento.title} className="w-full h-40 object-cover" />
                )}
                <div className="p-5 space-y-2">
                  <h2 className="font-bold text-slate-900">{evento.title}</h2>
                  <p className="text-sm text-slate-500">{formatDateBR(evento.date)}{evento.locationAddress ? ` · ${evento.locationAddress}` : ''}</p>
                  <p className="text-sm font-bold text-primary">{menorPreco > 0 ? `A partir de ${fmtBRL(menorPreco)}` : 'Gratuito'}</p>
                </div>
              </Link>
            );
          })}
          {abertos.length === 0 && (
            <p className="text-center text-slate-400 col-span-2 py-10">Nenhum evento com inscrição aberta no momento.</p>
          )}
        </div>
      </div>
    </div>
  );
}
