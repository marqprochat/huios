import Link from 'next/link';
import prisma from '@/lib/prisma';
import { requirePageAccess } from '@/lib/permissions/page-guard';
import { formatDateBR } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function EventosPage() {
  await requirePageAccess('eventos.visualizar');

  const eventos = await (prisma as any).event.findMany({
    where: { registrationEnabled: true },
    include: {
      registrations: { select: { status: true, amount: true } },
    },
    orderBy: { date: 'desc' },
  });

  return (
    <div className="mx-auto max-w-[1200px] p-4 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Eventos</h2>
          <p className="text-slate-500 dark:text-slate-400">Excursões e eventos extras com inscrição</p>
        </div>
        <Link href="/eventos/novo" className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all">
          + Novo evento
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 text-left text-slate-500">
            <tr>
              <th className="p-4 font-semibold">Evento</th>
              <th className="p-4 font-semibold">Data</th>
              <th className="p-4 font-semibold">Situação</th>
              <th className="p-4 font-semibold">Inscritos</th>
              <th className="p-4 font-semibold">Arrecadado</th>
              <th className="p-4 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {eventos.map((evento: any) => {
              const confirmadas = evento.registrations.filter((r: any) => r.status === 'CONFIRMADA');
              const pendentes = evento.registrations.filter((r: any) => r.status === 'PENDENTE');
              const arrecadado = confirmadas.reduce((sum: number, r: any) => sum + r.amount, 0);
              return (
                <tr key={evento.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-4 font-bold text-slate-900 dark:text-white">{evento.title}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{formatDateBR(evento.date)}</td>
                  <td className="p-4">
                    {!evento.isPublished ? (
                      <span className="text-xs font-bold uppercase text-slate-400">Rascunho</span>
                    ) : (
                      <span className="text-xs font-bold uppercase text-emerald-600">Publicado</span>
                    )}
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{confirmadas.length} confirmadas · {pendentes.length} pendentes</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{fmtBRL(arrecadado)}</td>
                  <td className="p-4 text-right space-x-3 whitespace-nowrap">
                    <Link href={`/eventos/${evento.id}/inscritos`} className="text-primary text-xs font-bold hover:underline">Inscritos</Link>
                    <Link href={`/eventos/${evento.id}/editar`} className="text-primary text-xs font-bold hover:underline">Editar</Link>
                  </td>
                </tr>
              );
            })}
            {eventos.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400">Nenhum evento com inscrição cadastrado ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
