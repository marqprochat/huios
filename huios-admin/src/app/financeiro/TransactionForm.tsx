'use client';

import { useState, useTransition } from 'react';
import { createTransaction, updateTransaction } from './actions';

interface Category { id: string; name: string; color: string | null }
interface Student { id: string; name: string }
interface Teacher { id: string; name: string }

interface Transaction {
  id?: string;
  status: string;
  amount: number;
  description: string;
  dueDate: string;
  paidAt: string | null;
  paymentMethod: string | null;
  notes: string | null;
  categoryId?: string | null;
  studentId?: string | null;
  teacherId?: string | null;
  enrollmentId?: string | null;
}

interface Props {
  type: 'RECEITA' | 'DESPESA';
  transaction?: Transaction | null;
  categories: Category[];
  students?: Student[];
  teachers?: Teacher[];
  onSaved: () => void;
}

const PAYMENT_METHODS = [
  { value: 'PIX', label: 'PIX' },
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'TRANSFERENCIA', label: 'Transferência' },
  { value: 'CARTAO', label: 'Cartão' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'OUTRO', label: 'Outro' },
];

export function TransactionForm({ type, transaction, categories, students = [], teachers = [], onSaved }: Props) {
  const isEdit = !!transaction?.id;
  const [status, setStatus] = useState(transaction?.status ?? 'PENDENTE');
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredCategories = categories.filter(c => {
    // categories with null type apply to both
    const cat = c as any;
    if (!cat.type) return true;
    return cat.type === type;
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    data.set('type', type);

    startTransition(async () => {
      const res = isEdit
        ? await updateTransaction(transaction!.id!, null, data)
        : await createTransaction(null, data);
      setResult({ ok: res.success, msg: res.message });
      if (res.success) onSaved();
    });
  };

  const toDateInput = (iso: string | null | undefined) => {
    if (!iso) return '';
    return iso.slice(0, 10);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Descrição *</label>
          <input
            name="description"
            required
            defaultValue={transaction?.description ?? ''}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Ex: Mensalidade de junho"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Valor (R$) *</label>
          <input
            name="amount"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={transaction?.amount ?? ''}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Vencimento *</label>
          <input
            name="dueDate"
            type="date"
            required
            defaultValue={toDateInput(transaction?.dueDate)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Categoria</label>
          <select
            name="categoryId"
            defaultValue={transaction?.categoryId ?? ''}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Sem categoria</option>
            {filteredCategories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Status</label>
          <select
            name="status"
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="PENDENTE">Pendente</option>
            <option value="PAGO">Pago</option>
            <option value="VENCIDO">Vencido</option>
            <option value="CANCELADO">Cancelado</option>
            <option value="ISENTO">Isento</option>
          </select>
        </div>

        {status === 'PAGO' && (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Método de Pagamento</label>
              <select
                name="paymentMethod"
                defaultValue={transaction?.paymentMethod ?? ''}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Selecione</option>
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Data do Pagamento</label>
              <input
                name="paidAt"
                type="date"
                defaultValue={toDateInput(transaction?.paidAt) || toDateInput(new Date().toISOString())}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </>
        )}

        {type === 'RECEITA' && students.length > 0 && (
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Aluno</label>
            <select
              name="studentId"
              defaultValue={transaction?.studentId ?? ''}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Nenhum</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        {type === 'DESPESA' && teachers.length > 0 && (
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Professor (opcional)</label>
            <select
              name="teacherId"
              defaultValue={transaction?.teacherId ?? ''}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Nenhum</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Observações</label>
          <textarea
            name="notes"
            rows={2}
            defaultValue={transaction?.notes ?? ''}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            placeholder="Observações opcionais..."
          />
        </div>
      </div>

      {result && (
        <p className={`text-sm font-bold ${result.ok ? 'text-emerald-600' : 'text-red-600'}`}>{result.msg}</p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-sm">save</span>
          {isPending ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Lançamento'}
        </button>
      </div>
    </form>
  );
}
