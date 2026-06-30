'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDateBR } from '@/lib/date-utils';

interface Item {
  id: string;
  description: string;
  amount: number;
  status: string;
  overdue: boolean;
  dueDate: string;
  paidAt: string | null;
  paymentMethod: string | null;
  category: string | null;
  courseName: string | null;
  className: string | null;
  payable: boolean;
}

interface Summary {
  pendingCount: number;
  overdueCount: number;
  pendingTotal: number;
  paidTotal: number;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (iso: string | null) => (iso ? formatDateBR(iso) : '—');

export default function PortalFinanceiroPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/portal/financeiro');
        if (res.ok) {
          const d = await res.json();
          setItems(d.items || []);
          setSummary(d.summary || null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pendentes = items.filter(i => i.payable);
  const pagas = items.filter(i => i.status === 'PAGO');
  const outras = items.filter(i => !i.payable && i.status !== 'PAGO');

  const statusBadge = (i: Item) => {
    if (i.status === 'PAGO') return { label: 'Pago', cls: 'bg-emerald-50 text-emerald-700' };
    if (i.overdue) return { label: 'Vencido', cls: 'bg-red-50 text-red-700' };
    if (i.status === 'CANCELADO') return { label: 'Cancelado', cls: 'bg-slate-100 text-slate-500' };
    if (i.status === 'ISENTO') return { label: 'Isento', cls: 'bg-blue-50 text-blue-700' };
    return { label: 'Pendente', cls: 'bg-amber-50 text-amber-700' };
  };

  return (
    <div className="max-w-[1100px] mx-auto p-4 lg:p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Financeiro</h2>
        <p className="text-slate-500 text-sm">Seus débitos, mensalidades e pagamentos</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">A pagar</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{summary ? fmt(summary.pendingTotal) : '—'}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{summary?.pendingCount ?? 0} cobrança(s)</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vencidas</p>
          <p className={`text-2xl font-bold mt-1 ${(summary?.overdueCount ?? 0) > 0 ? 'text-red-600' : 'text-slate-700'}`}>{summary?.overdueCount ?? 0}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">cobranças em atraso</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total pago</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{summary ? fmt(summary.paidTotal) : '—'}</p>
        </div>
      </div>

      {/* Overdue alert */}
      {summary && summary.overdueCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-red-600">warning</span>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-red-900 text-sm">Você tem cobranças vencidas</h3>
            <p className="text-red-700 text-xs mt-1">Regularize o quanto antes para evitar bloqueios. Clique em &quot;Pagar&quot; abaixo.</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="material-symbols-outlined animate-spin text-[#135bec] text-3xl">refresh</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pendentes / a pagar */}
          <Section title="Em aberto" empty={pendentes.length === 0} emptyText="Nenhuma cobrança em aberto. Tudo em dia! 🎉">
            {pendentes.map(i => {
              const b = statusBadge(i);
              return (
                <div key={i.id} className="flex items-center justify-between gap-3 p-4 border-b border-slate-100 last:border-0">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{i.description}</p>
                    <p className="text-xs text-slate-400">
                      Vence {fmtDate(i.dueDate)}{i.category ? ` · ${i.category}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="font-bold text-slate-800 text-sm">{fmt(i.amount)}</p>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${b.cls}`}>{b.label}</span>
                    </div>
                    <Link href={`/matricula/pagamento/${i.id}?retorno=/portal/financeiro`} className="bg-[#135bec] text-white px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 whitespace-nowrap">
                      Pagar
                    </Link>
                  </div>
                </div>
              );
            })}
          </Section>

          {/* Pagas */}
          {pagas.length > 0 && (
            <Section title="Pagas" empty={false}>
              {pagas.map(i => (
                <div key={i.id} className="flex items-center justify-between gap-3 p-4 border-b border-slate-100 last:border-0">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-700 text-sm truncate">{i.description}</p>
                    <p className="text-xs text-slate-400">
                      Pago em {fmtDate(i.paidAt)}{i.paymentMethod ? ` · ${i.paymentMethod}` : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-slate-500 text-sm line-through">{fmt(i.amount)}</p>
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">Pago</span>
                  </div>
                </div>
              ))}
            </Section>
          )}

          {outras.length > 0 && (
            <Section title="Outras" empty={false}>
              {outras.map(i => {
                const b = statusBadge(i);
                return (
                  <div key={i.id} className="flex items-center justify-between gap-3 p-4 border-b border-slate-100 last:border-0">
                    <p className="font-semibold text-slate-700 text-sm truncate">{i.description}</p>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${b.cls}`}>{b.label}</span>
                  </div>
                );
              })}
            </Section>
          )}

          {items.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-3">receipt_long</span>
              <p className="text-slate-500">Você ainda não possui cobranças.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children, empty, emptyText }: { title: string; children?: React.ReactNode; empty: boolean; emptyText?: string }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1 mb-3">{title}</h3>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {empty ? <p className="p-6 text-center text-sm text-slate-400">{emptyText}</p> : children}
      </div>
    </div>
  );
}
