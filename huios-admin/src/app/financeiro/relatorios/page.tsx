'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { exportCSV } from '@/lib/exportCSV';
import { formatDateBR } from '@/lib/date-utils';

interface Row {
  month: string;
  receita: number;
  despesa: number;
  saldo: number;
}

interface DefaultRow {
  studentName: string;
  studentId: string;
  description: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
}

interface CatRow {
  category: string;
  type: string;
  total: number;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string) => formatDateBR(d);

export default function RelatoriosFinanceiroPage() {
  const [tab, setTab] = useState<'mensal' | 'inadimplencia' | 'categorias'>('mensal');
  const [monthlyRows, setMonthlyRows] = useState<Row[]>([]);
  const [defaultRows, setDefaultRows] = useState<DefaultRow[]>([]);
  const [catRows, setCatRows] = useState<CatRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [startMonth, setStartMonth] = useState('');
  const [endMonth, setEndMonth] = useState('');

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (startMonth) p.set('start', startMonth);
    if (endMonth) p.set('end', endMonth);
    fetch(`/api/financeiro/relatorios?${p}`)
      .then(r => r.json())
      .then(d => {
        setMonthlyRows(d.monthly ?? []);
        setDefaultRows(d.defaulters ?? []);
        setCatRows(d.byCategory ?? []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleExportMensal = () => {
    exportCSV('relatorio-mensal',
      ['Mês', 'Receitas', 'Despesas', 'Saldo'],
      monthlyRows.map(r => [r.month, fmt(r.receita), fmt(r.despesa), fmt(r.saldo)])
    );
  };

  const handleExportInadimplencia = () => {
    exportCSV('inadimplencia',
      ['Aluno', 'Descrição', 'Valor', 'Vencimento', 'Dias em Atraso'],
      defaultRows.map(r => [r.studentName, r.description, fmt(r.amount), fmtDate(r.dueDate), r.daysOverdue])
    );
  };

  const handleExportCategorias = () => {
    exportCSV('por-categoria',
      ['Categoria', 'Tipo', 'Total'],
      catRows.map(r => [r.category, r.type === 'RECEITA' ? 'Receita' : 'Despesa', fmt(r.total)])
    );
  };

  const TABS = [
    { id: 'mensal', label: 'Resumo Mensal', icon: 'calendar_month' },
    { id: 'inadimplencia', label: 'Inadimplência', icon: 'warning' },
    { id: 'categorias', label: 'Por Categoria', icon: 'label' },
  ] as const;

  return (
    <div className="max-w-[1200px] mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/financeiro" className="text-slate-400 hover:text-primary transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Relatórios Financeiros</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Análise detalhada das finanças da instituição</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Mês inicial</label>
            <input type="month" value={startMonth} onChange={e => setStartMonth(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Mês final</label>
            <input type="month" value={endMonth} onChange={e => setEndMonth(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90">
            <span className="material-symbols-outlined text-sm">refresh</span>Atualizar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === t.id ? 'bg-primary text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary'}`}>
            <span className="material-symbols-outlined text-sm">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20">
          <span className="material-symbols-outlined text-4xl animate-spin text-primary">refresh</span>
        </div>
      ) : (
        <>
          {/* Resumo Mensal */}
          {tab === 'mensal' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 dark:text-white">Resumo por Mês</h3>
                {monthlyRows.length > 0 && (
                  <button onClick={handleExportMensal} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:border-primary hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-sm">download</span>CSV
                  </button>
                )}
              </div>
              {monthlyRows.length === 0 ? (
                <div className="p-10 text-center text-slate-400">Nenhum dado no período selecionado</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[500px]">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                      <tr>
                        {['Mês', 'Receitas', 'Despesas', 'Saldo'].map(h => (
                          <th key={h} className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {monthlyRows.map(r => (
                        <tr key={r.month} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-5 py-3.5 font-medium text-slate-700 dark:text-slate-300">{r.month}</td>
                          <td className="px-5 py-3.5 font-bold text-emerald-600">{fmt(r.receita)}</td>
                          <td className="px-5 py-3.5 font-bold text-red-600">{fmt(r.despesa)}</td>
                          <td className={`px-5 py-3.5 font-black ${r.saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(r.saldo)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Inadimplência */}
          {tab === 'inadimplencia' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white">Inadimplência</h3>
                  <p className="text-xs text-slate-400">Alunos com cobranças vencidas</p>
                </div>
                {defaultRows.length > 0 && (
                  <button onClick={handleExportInadimplencia} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:border-primary hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-sm">download</span>CSV
                  </button>
                )}
              </div>
              {defaultRows.length === 0 ? (
                <div className="p-10 text-center text-slate-400">
                  <span className="material-symbols-outlined text-4xl mb-2 text-emerald-400">check_circle</span>
                  <p>Nenhuma inadimplência!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                      <tr>
                        {['Aluno', 'Descrição', 'Valor', 'Vencimento', 'Dias em Atraso'].map(h => (
                          <th key={h} className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {defaultRows.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-5 py-3.5">
                            <Link href={`/alunos/${r.studentId}`} className="font-medium text-primary hover:underline text-sm">{r.studentName}</Link>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-slate-600 dark:text-slate-400">{r.description}</td>
                          <td className="px-5 py-3.5 font-bold text-red-600 text-sm">{fmt(r.amount)}</td>
                          <td className="px-5 py-3.5 text-sm text-slate-600 dark:text-slate-400">{fmtDate(r.dueDate)}</td>
                          <td className="px-5 py-3.5">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">{r.daysOverdue} dias</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Por Categoria */}
          {tab === 'categorias' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 dark:text-white">Por Categoria</h3>
                {catRows.length > 0 && (
                  <button onClick={handleExportCategorias} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:border-primary hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-sm">download</span>CSV
                  </button>
                )}
              </div>
              {catRows.length === 0 ? (
                <div className="p-10 text-center text-slate-400">Nenhum dado no período selecionado</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[400px]">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                      <tr>
                        {['Categoria', 'Tipo', 'Total'].map(h => (
                          <th key={h} className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {catRows.map(r => (
                        <tr key={`${r.category}-${r.type}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-5 py-3.5 font-medium text-slate-700 dark:text-slate-300">{r.category}</td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.type === 'RECEITA' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {r.type === 'RECEITA' ? 'Receita' : 'Despesa'}
                            </span>
                          </td>
                          <td className={`px-5 py-3.5 font-black ${r.type === 'RECEITA' ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(r.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
