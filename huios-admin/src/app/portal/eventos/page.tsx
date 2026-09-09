'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toLocalDate } from '@/lib/date-utils';

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Ticket { id: string; name: string; price: number; available: boolean }
interface OpenEvent { id: string; title: string; date: string; bannerUrl: string | null; tickets: Ticket[] }
interface MyRegistration { id: string; eventTitle: string; eventDate: string; status: string; amount: number; createdAt: string }

const statusLabel: Record<string, string> = {
  PENDENTE: 'Pagamento pendente', CONFIRMADA: 'Confirmada', CANCELADA: 'Cancelada', EXPIRADA: 'Expirada',
};

export default function PortalEventosPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'abertos' | 'minhas'>('abertos');
  const [open, setOpen] = useState<OpenEvent[]>([]);
  const [mine, setMine] = useState<MyRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await fetch('/api/portal/eventos');
      if (res.ok) {
        const data = await res.json();
        setOpen(data.open || []);
        setMine(data.myRegistrations || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const inscrever = async (eventId: string, ticketId: string) => {
    setSubmitting(ticketId);
    try {
      const res = await fetch('/api/portal/eventos/inscrever', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, ticketId }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Erro ao se inscrever.'); return; }
      if (data.requiresPayment) {
        router.push(`/matricula/pagamento/${data.transactionId}?retorno=/portal/eventos`);
      } else {
        await load();
        setTab('minhas');
      }
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) return <div className="p-6 text-slate-400">Carregando...</div>;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <h1 className="text-xl font-black text-slate-900 dark:text-white">Eventos</h1>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        <button onClick={() => setTab('abertos')} className={`px-4 py-2 text-sm font-bold ${tab === 'abertos' ? 'text-primary border-b-2 border-primary' : 'text-slate-400'}`}>Eventos abertos</button>
        <button onClick={() => setTab('minhas')} className={`px-4 py-2 text-sm font-bold ${tab === 'minhas' ? 'text-primary border-b-2 border-primary' : 'text-slate-400'}`}>Minhas inscrições</button>
      </div>

      {tab === 'abertos' && (
        <div className="space-y-4">
          {open.map((evento) => (
            <div key={evento.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-white">{evento.title}</h3>
              <p className="text-sm text-slate-500">{toLocalDate(evento.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              <div className="space-y-2">
                {evento.tickets.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 p-3">
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{t.name}</p>
                      <p className="text-xs text-slate-500">{t.price > 0 ? fmtBRL(t.price) : 'Gratuito'}</p>
                    </div>
                    <button
                      disabled={!t.available || submitting === t.id}
                      onClick={() => inscrever(evento.id, t.id)}
                      className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {t.available ? (submitting === t.id ? 'Enviando...' : 'Inscrever-se') : 'Esgotado'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {open.length === 0 && <p className="text-center text-slate-400 py-10">Nenhum evento com inscrição aberta no momento.</p>}
        </div>
      )}

      {tab === 'minhas' && (
        <div className="space-y-3">
          {mine.map((r) => (
            <div key={r.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{r.eventTitle}</p>
                <p className="text-xs text-slate-500">{toLocalDate(r.eventDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} · {r.amount > 0 ? fmtBRL(r.amount) : 'Gratuito'}</p>
              </div>
              <span className="text-xs font-bold uppercase text-primary">{statusLabel[r.status] || r.status}</span>
            </div>
          ))}
          {mine.length === 0 && <p className="text-center text-slate-400 py-10">Você ainda não se inscreveu em nenhum evento.</p>}
        </div>
      )}
    </div>
  );
}
