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
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-indigo-700 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="relative max-w-5xl mx-auto px-6 py-16 md:py-24 text-center">
          <div className="inline-flex items-center justify-center rounded-3xl bg-white p-5 mb-6 shadow-2xl shadow-black/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Huios" className="h-48 w-auto object-contain" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
            Eventos
          </h1>
          <p className="text-lg md:text-xl text-white/80 mt-3 font-medium">Seminário Teológico Huios</p>
          <p className="max-w-2xl mx-auto text-white/70 mt-5 text-sm md:text-base">
            Excursões e eventos extras abertos para alunos e para toda a comunidade.
            Confira o que está disponível e faça sua inscrição online.
          </p>
          {abertos.length > 0 && (
            <a href="#eventos" className="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-xl text-sm font-bold mt-8 hover:bg-white/90 transition-colors shadow-xl">
              Ver eventos disponíveis
              <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
            </a>
          )}
          <p className="text-sm text-white/70 mt-6">
            Já é aluno?{' '}
            <Link href="/portal/login" className="font-bold text-white underline underline-offset-2 hover:text-white/90">
              Entre no portal
            </Link>{' '}
            para se inscrever com o valor de aluno.
          </p>
        </div>
      </header>

      {/* Eventos */}
      <main id="eventos" className="max-w-5xl mx-auto px-6 py-14">
        {abertos.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">event_busy</span>
            <h2 className="text-xl font-black text-slate-800">Nenhum evento com inscrição aberta no momento</h2>
            <p className="text-slate-500 text-sm mt-2">Volte em breve ou entre em contato com a coordenação.</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900">Eventos disponíveis</h2>
              <p className="text-slate-500 mt-2">Selecione o evento desejado para ver os detalhes e se inscrever.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {abertos.map((evento: any) => {
                const menorPreco = Math.min(...evento.tickets.map((t: any) => Math.min(t.priceStudent, t.priceGeneral)));
                return (
                  <Link key={evento.id} href={`/evento/${evento.publicSlug}`} className="group rounded-2xl border border-slate-200 overflow-hidden hover:border-primary hover:shadow-xl transition-all flex items-stretch">
                    <div className="shrink-0 self-stretch w-28 sm:w-36 md:w-44 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-3 sm:p-4">
                      {evento.bannerUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={evento.bannerUrl} alt={evento.title} className="w-full aspect-square object-cover rounded-xl" />
                      ) : (
                        <span className="material-symbols-outlined text-5xl text-slate-300">celebration</span>
                      )}
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="font-black text-slate-900 text-lg leading-snug">{evento.title}</h3>
                      {evento.type && <p className="text-sm font-bold text-primary">{evento.type}</p>}
                      <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                          {formatDateBR(evento.date)}
                        </span>
                        {evento.locationAddress && (
                          <span className="inline-flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">location_on</span>
                            {evento.locationAddress}
                          </span>
                        )}
                      </div>
                      <div className="mt-auto pt-4 flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-700">
                          {menorPreco > 0 ? `A partir de ${fmtBRL(menorPreco)}` : 'Gratuito'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-primary text-sm font-bold group-hover:underline">
                          Ver detalhes
                          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-slate-100 py-8 text-center text-xs text-slate-400">
        <p>Seminário Teológico Huios · Igreja Conviva</p>
      </footer>
    </div>
  );
}
