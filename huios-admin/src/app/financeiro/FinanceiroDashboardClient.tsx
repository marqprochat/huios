'use client';

import Link from 'next/link';

interface KPIs {
  totalReceita: number;
  totalDespesa: number;
  vencidos: number;
  recebidoMes: number;
  pagoMes: number;
}

interface MonthData {
  label: string;
  key: string;
  receita: number;
  despesa: number;
}

interface Transaction {
  id: string;
  type: string;
  status: string;
  amount: number;
  description: string;
  dueDate: string;
  category: { name: string; color: string | null } | null;
  student: { name: string } | null;
  teacher: { name: string } | null;
}

interface Props {
  kpis: KPIs;
  upcoming: Transaction[];
  months: MonthData[];
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  PENDENTE: { bg: 'bg-amber-100', color: 'text-amber-700', label: 'Pendente' },
  VENCIDO:  { bg: 'bg-red-100',   color: 'text-red-700',   label: 'Vencido' },
};

export function FinanceiroDashboardClient({ kpis, upcoming, months }: Props) {
  const maxBar = Math.max(...months.map(m => Math.max(m.receita, m.despesa)), 1);

  const saldoMes = kpis.recebidoMes - kpis.pagoMes;

  return (
    <div className="max-w-[1400px] mx-auto p-4 lg:p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Financeiro</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Visão geral das finanças da instituição</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/financeiro/contas-a-receber?status=PENDENTE" className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 hover:border-amber-300 transition-colors">
          <div className="flex items-start justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">A Receber</p>
            <span className="material-symbols-outlined text-amber-500 text-xl">arrow_downward</span>
          </div>
          <p className="text-2xl font-black mt-2 text-amber-600">{fmt(kpis.totalReceita)}</p>
          <p className="text-xs text-slate-400 mt-1">Pendente + Vencido</p>
        </Link>

        <Link href="/financeiro/contas-a-pagar?status=PENDENTE" className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 hover:border-red-300 transition-colors">
          <div className="flex items-start justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">A Pagar</p>
            <span className="material-symbols-outlined text-red-500 text-xl">arrow_upward</span>
          </div>
          <p className="text-2xl font-black mt-2 text-red-600">{fmt(kpis.totalDespesa)}</p>
          <p className="text-xs text-slate-400 mt-1">Pendente + Vencido</p>
        </Link>

        <div className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 ${kpis.vencidos > 0 ? 'border-red-200' : 'border-slate-200 dark:border-slate-800'}`}>
          <div className="flex items-start justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vencidos</p>
            <span className={`material-symbols-outlined text-xl ${kpis.vencidos > 0 ? 'text-red-500' : 'text-slate-400'}`}>warning</span>
          </div>
          <p className={`text-2xl font-black mt-2 ${kpis.vencidos > 0 ? 'text-red-600' : 'text-slate-400'}`}>{kpis.vencidos}</p>
          <p className="text-xs text-slate-400 mt-1">Lançamentos vencidos</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-start justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Saldo do Mês</p>
            <span className={`material-symbols-outlined text-xl ${saldoMes >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>account_balance</span>
          </div>
          <p className={`text-2xl font-black mt-2 ${saldoMes >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(saldoMes)}</p>
          <p className="text-xs text-slate-400 mt-1">Recebido − Pago (mês atual)</p>
        </div>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Recebido este mês</p>
          <p className="text-xl font-black text-emerald-600">{fmt(kpis.recebidoMes)}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pago este mês</p>
          <p className="text-xl font-black text-slate-700 dark:text-slate-300">{fmt(kpis.pagoMes)}</p>
        </div>
      </div>

      {/* Monthly chart */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="font-bold text-slate-800 dark:text-white mb-5">Últimos 6 Meses</h3>
        <div className="flex items-end gap-3 h-32">
          {months.map(m => (
            <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex gap-1 items-end" style={{ height: '96px' }}>
                <div
                  className="flex-1 bg-emerald-400 rounded-t-md transition-all"
                  style={{ height: `${Math.max((m.receita / maxBar) * 96, m.receita > 0 ? 4 : 0)}px` }}
                  title={`Receita: ${fmt(m.receita)}`}
                />
                <div
                  className="flex-1 bg-red-400 rounded-t-md transition-all"
                  style={{ height: `${Math.max((m.despesa / maxBar) * 96, m.despesa > 0 ? 4 : 0)}px` }}
                  title={`Despesa: ${fmt(m.despesa)}`}
                />
              </div>
              <span className="text-[10px] text-slate-400 font-medium">{m.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-400" /><span className="text-xs text-slate-500">Receita</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-400" /><span className="text-xs text-slate-500">Despesa</span></div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { href: '/financeiro/contas-a-receber', icon: 'arrow_downward', label: 'Contas a Receber', color: 'text-emerald-600' },
          { href: '/financeiro/contas-a-pagar', icon: 'arrow_upward', label: 'Contas a Pagar', color: 'text-red-600' },
          { href: '/financeiro/precos-cursos', icon: 'sell', label: 'Preços dos Cursos', color: 'text-blue-600' },
          { href: '/financeiro/categorias', icon: 'label', label: 'Categorias', color: 'text-violet-600' },
          { href: '/financeiro/relatorios', icon: 'bar_chart', label: 'Relatórios', color: 'text-amber-600' },
        ].map(l => (
          <Link key={l.href} href={l.href} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col items-center gap-2 hover:border-primary transition-colors text-center">
            <span className={`material-symbols-outlined text-2xl ${l.color}`}>{l.icon}</span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{l.label}</span>
          </Link>
        ))}
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-800 dark:text-white">Próximos Vencimentos</h3>
            <p className="text-xs text-slate-400 mt-0.5">Lançamentos pendentes nos próximos 7 dias</p>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {upcoming.map(t => {
              const st = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.PENDENTE;
              return (
                <div key={t.id} className="px-5 py-3.5 flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${t.type === 'RECEITA' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    <span className={`material-symbols-outlined text-sm ${t.type === 'RECEITA' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {t.type === 'RECEITA' ? 'arrow_downward' : 'arrow_upward'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{t.description}</p>
                    <p className="text-xs text-slate-400">
                      {t.student?.name ?? t.teacher?.name ?? t.category?.name ?? '—'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-white">{fmt(t.amount)}</p>
                    <p className="text-xs text-slate-400">{fmtDate(t.dueDate)}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${st.bg} ${st.color}`}>{st.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
