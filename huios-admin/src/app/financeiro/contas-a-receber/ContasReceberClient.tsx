'use client';

import { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { markAsPaid, deleteTransaction } from '../actions';
import { TransactionForm } from '../TransactionForm';
import { exportCSV } from '@/lib/exportCSV';

interface Category { id: string; name: string; color: string | null }
interface Student { id: string; name: string }

interface Transaction {
  id: string;
  type: string;
  status: string;
  amount: number;
  description: string;
  dueDate: string;
  paidAt: string | null;
  paymentMethod: string | null;
  notes: string | null;
  category: Category | null;
  student: Student | null;
  enrollment: { class: { course: { name: string } } } | null;
}

interface Props {
  transactions: Transaction[];
  categories: Category[];
  students: Student[];
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  PENDENTE:  { label: 'Pendente',   bg: 'bg-amber-100',   color: 'text-amber-700' },
  PAGO:      { label: 'Pago',       bg: 'bg-emerald-100', color: 'text-emerald-700' },
  VENCIDO:   { label: 'Vencido',    bg: 'bg-red-100',     color: 'text-red-700' },
  CANCELADO: { label: 'Cancelado',  bg: 'bg-slate-100',   color: 'text-slate-500' },
  ISENTO:    { label: 'Isento',     bg: 'bg-blue-100',    color: 'text-blue-700' },
};

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

export function ContasReceberClient({ transactions: initial, categories, students }: Props) {
  const [transactions, setTransactions] = useState(initial);
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (monthFilter) {
        const d = new Date(t.dueDate);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (ym !== monthFilter) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        if (!t.description.toLowerCase().includes(q) &&
            !t.student?.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [transactions, statusFilter, monthFilter, search]);

  const totals = useMemo(() => ({
    pendente: filtered.filter(t => t.status === 'PENDENTE').reduce((s, t) => s + t.amount, 0),
    pago: filtered.filter(t => t.status === 'PAGO').reduce((s, t) => s + t.amount, 0),
    vencido: filtered.filter(t => t.status === 'VENCIDO').reduce((s, t) => s + t.amount, 0),
  }), [filtered]);

  const handleMarkPaid = (id: string) => {
    startTransition(async () => {
      await markAsPaid(id);
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: 'PAGO', paidAt: new Date().toISOString() } : t));
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Excluir este lançamento?')) return;
    startTransition(async () => {
      await deleteTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
    });
  };

  const handleExport = () => {
    exportCSV('contas-receber',
      ['Aluno', 'Curso', 'Descrição', 'Categoria', 'Valor', 'Vencimento', 'Status', 'Pago Em'],
      filtered.map(t => [
        t.student?.name ?? '—',
        t.enrollment?.class?.course?.name ?? '—',
        t.description,
        t.category?.name ?? '—',
        fmt(t.amount),
        fmtDate(t.dueDate),
        STATUS_CONFIG[t.status]?.label ?? t.status,
        t.paidAt ? fmtDate(t.paidAt) : '—',
      ])
    );
  };

  const onSaved = () => {
    setShowForm(false);
    setEditingTx(null);
    window.location.reload();
  };

  return (
    <div className="max-w-[1400px] mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/financeiro" className="text-slate-400 hover:text-primary transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Contas a Receber</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Cobranças e mensalidades dos alunos</p>
          </div>
        </div>
        <div className="flex gap-2">
          {filtered.length > 0 && (
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:border-primary hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-sm">download</span>CSV
            </button>
          )}
          <button onClick={() => { setEditingTx(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-all">
            <span className="material-symbols-outlined text-sm">add</span>
            Nova Cobrança
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'A Receber', value: totals.pendente, color: 'text-amber-600' },
          { label: 'Recebido', value: totals.pago, color: 'text-emerald-600' },
          { label: 'Vencido', value: totals.vencido, color: 'text-red-600' },
        ].map(c => (
          <div key={c.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{c.label}</p>
            <p className={`text-xl font-black mt-1 ${c.color}`}>{fmt(c.value)}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Todos</option>
              {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Mês/Ano</label>
            <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Buscar</label>
            <input type="text" placeholder="Nome do aluno ou descrição..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {(showForm || editingTx) && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-primary/30 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 dark:text-white">{editingTx ? 'Editar Cobrança' : 'Nova Cobrança'}</h3>
            <button onClick={() => { setShowForm(false); setEditingTx(null); }} className="text-slate-400 hover:text-slate-600">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <TransactionForm
            type="RECEITA"
            transaction={editingTx as any}
            categories={categories}
            students={students}
            onSaved={onSaved}
          />
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <span className="material-symbols-outlined text-5xl mb-3">arrow_downward</span>
          <p>Nenhuma cobrança encontrada</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">{filtered.length} lançamento{filtered.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  {['Aluno', 'Descrição', 'Categoria', 'Valor', 'Vencimento', 'Status', 'Ações'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(t => {
                  const st = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.PENDENTE;
                  const isOverdue = t.status === 'PENDENTE' && new Date(t.dueDate) < new Date();
                  return (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-3.5">
                        {t.student ? (
                          <Link href={`/alunos/${t.student.id}`} className="font-medium text-primary hover:underline text-sm">{t.student.name}</Link>
                        ) : <span className="text-slate-400 text-sm">—</span>}
                        {t.enrollment?.class?.course?.name && (
                          <p className="text-[11px] text-slate-400">{t.enrollment.class.course.name}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-700 dark:text-slate-300">{t.description}</td>
                      <td className="px-5 py-3.5">
                        {t.category ? (
                          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.category.color ?? '#6b7280' }} />
                            {t.category.name}
                          </span>
                        ) : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-white text-sm">{fmt(t.amount)}</td>
                      <td className="px-5 py-3.5 text-sm">
                        <span className={isOverdue ? 'text-red-600 font-bold' : 'text-slate-600 dark:text-slate-400'}>{fmtDate(t.dueDate)}</span>
                        {isOverdue && <p className="text-[10px] text-red-500 font-bold">VENCIDA</p>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${st.bg} ${st.color}`}>{st.label}</span>
                        {t.paidAt && <p className="text-[10px] text-slate-400 mt-0.5">{fmtDate(t.paidAt)}</p>}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          {(t.status === 'PENDENTE' || t.status === 'VENCIDO') && (
                            <button
                              onClick={() => handleMarkPaid(t.id)}
                              disabled={isPending}
                              title="Marcar como pago"
                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm">check_circle</span>
                            </button>
                          )}
                          <button
                            onClick={() => { setEditingTx(t); setShowForm(false); }}
                            title="Editar"
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            title="Excluir"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
