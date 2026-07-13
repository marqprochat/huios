'use client';

import { useState, useTransition, useMemo } from 'react';
import { createTransaction, updateTransaction, createBulkTransactions, createPaymentForm, createAccount } from './actions';
import TransactionAttachments from './TransactionAttachments';

interface Category { id: string; name: string; color: string | null }
interface Student { id: string; name: string }
interface Teacher { id: string; name: string }
interface NamedItem { id: string; name: string }

const qInput = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/30';
const qLabel = 'block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1';

/** Select com cadastro rápido: botão ＋ abre input inline que cria e já seleciona o item. */
function QuickAddSelect({ label, name, initial, initialSelectedId, onCreate }: {
  label: string;
  name: string;
  initial: NamedItem[];
  initialSelectedId?: string | null;
  onCreate: (name: string) => Promise<{ success: boolean; item?: NamedItem; message?: string }>;
}) {
  const [options, setOptions] = useState<NamedItem[]>(initial);
  const [selected, setSelected] = useState(initialSelectedId ?? '');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const add = async () => {
    const n = newName.trim();
    if (!n) return;
    setBusy(true); setErr('');
    const res = await onCreate(n);
    setBusy(false);
    if (res.success && res.item) {
      const item = res.item;
      setOptions(prev => [...prev, item].sort((a, b) => a.name.localeCompare(b.name)));
      setSelected(item.id);
      setNewName(''); setAdding(false);
    } else {
      setErr(res.message || 'Erro ao cadastrar');
    }
  };

  return (
    <div>
      <label className={qLabel}>{label}</label>
      <div className="flex gap-2">
        <select name={name} value={selected} onChange={e => setSelected(e.target.value)} className={qInput}>
          <option value="">Selecione</option>
          {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <button type="button" onClick={() => setAdding(v => !v)} title={`Cadastrar ${label.toLowerCase()}`}
          className="shrink-0 w-11 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary hover:text-primary transition-colors flex items-center justify-center">
          <span className="material-symbols-outlined text-base">{adding ? 'close' : 'add'}</span>
        </button>
      </div>
      {adding && (
        <div className="flex gap-2 mt-2">
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            placeholder={`Nova ${label.toLowerCase()}...`} className={qInput} />
          <button type="button" onClick={add} disabled={busy || !newName.trim()}
            className="shrink-0 px-4 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 disabled:opacity-50">
            {busy ? '...' : 'Salvar'}
          </button>
        </div>
      )}
      {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
    </div>
  );
}
interface ClassStudent { id: string; name: string; enrollmentId: string }
interface ClassOption { id: string; name: string; courseName: string; students: ClassStudent[] }

interface Transaction {
  id?: string;
  status: string;
  amount: number;
  description: string;
  dueDate: string | Date;
  paidAt: string | Date | null;
  paymentMethod: string | null;
  notes: string | null;
  categoryId?: string | null;
  studentId?: string | null;
  teacherId?: string | null;
  enrollmentId?: string | null;
  paymentFormId?: string | null;
  accountId?: string | null;
}

interface Props {
  type: 'RECEITA' | 'DESPESA';
  transaction?: Transaction | null;
  categories: Category[];
  students?: Student[];
  teachers?: Teacher[];
  classes?: ClassOption[];
  paymentForms?: NamedItem[];
  accounts?: NamedItem[];
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

export function TransactionForm({ type, transaction, categories, students = [], teachers = [], classes = [], paymentForms = [], accounts = [], onSaved }: Props) {
  const isEdit = !!transaction?.id;
  // Recursos de lançamento em lote só no fluxo RECEITA + criação.
  const bulkEnabled = type === 'RECEITA' && !isEdit;

  const [status, setStatus] = useState(transaction?.status ?? 'PENDENTE');
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Destinatário: individual (aluno único / avulso) ou turma (lote).
  const [mode, setMode] = useState<'individual' | 'turma'>('individual');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [installments, setInstallments] = useState(1);

  const selectedClass = useMemo(
    () => classes.find(c => c.id === selectedClassId) ?? null,
    [classes, selectedClassId]
  );

  const filteredCategories = categories.filter(c => {
    const cat = c as any;
    if (!cat.type) return true;
    return cat.type === type;
  });

  const pickClass = (id: string) => {
    setSelectedClassId(id);
    const cls = classes.find(c => c.id === id);
    // Marca todos os alunos cursando por padrão.
    setSelectedStudentIds(new Set(cls?.students.map(s => s.id) ?? []));
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allSelected = !!selectedClass && selectedStudentIds.size === selectedClass.students.length;
  const toggleAll = () => {
    if (!selectedClass) return;
    setSelectedStudentIds(allSelected ? new Set() : new Set(selectedClass.students.map(s => s.id)));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    data.set('type', type);

    startTransition(async () => {
      let res: { success: boolean; message: string };

      if (isEdit) {
        res = await updateTransaction(transaction!.id!, null, data);
      } else if (bulkEnabled) {
        // Monta o payload de lote.
        data.set('installments', String(Math.max(1, installments)));
        data.delete('studentId'); // controlado abaixo por studentIds[]

        if (mode === 'turma') {
          if (!selectedClass) { setResult({ ok: false, msg: 'Selecione uma turma.' }); return; }
          const ids = selectedClass.students.filter(s => selectedStudentIds.has(s.id));
          if (ids.length === 0) { setResult({ ok: false, msg: 'Selecione ao menos um aluno.' }); return; }
          for (const s of ids) data.append('studentIds', s.id);
          const enrollmentMap: Record<string, string> = {};
          for (const s of ids) enrollmentMap[s.id] = s.enrollmentId;
          data.set('enrollmentMap', JSON.stringify(enrollmentMap));
        } else {
          // Individual: aluno único (opcional). Sem aluno = avulso.
          const single = (data.get('individualStudentId') as string) || '';
          data.delete('individualStudentId');
          if (single) data.append('studentIds', single);
        }
        res = await createBulkTransactions(null, data);
      } else {
        // DESPESA (criação) — fluxo original.
        res = await createTransaction(null, data);
      }

      setResult({ ok: res.success, msg: res.message });
      if (res.success) onSaved();
    });
  };

  // dueDate/paidAt podem chegar como Date (vindos do Prisma via RSC) ou string.
  const toDateInput = (value: string | Date | null | undefined) => {
    if (!value) return '';
    const iso = typeof value === 'string' ? value : new Date(value).toISOString();
    return iso.slice(0, 10);
  };

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/30';
  const labelCls = 'block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Destinatário (RECEITA + criação) */}
      {bulkEnabled && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
          <div>
            <label className={labelCls}>Lançar para</label>
            <div className="flex gap-2">
              {([['individual', 'Aluno individual'], ['turma', 'Turma']] as const).map(([val, lbl]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setMode(val)}
                  className={`flex-1 px-3 py-2 rounded-xl text-sm font-bold border transition-colors ${
                    mode === val
                      ? 'bg-primary text-white border-primary'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {mode === 'individual' && students.length > 0 && (
            <div>
              <label className={labelCls}>Aluno (opcional)</label>
              <select name="individualStudentId" defaultValue={transaction?.studentId ?? ''} className={inputCls}>
                <option value="">Nenhum (avulso)</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          {mode === 'turma' && (
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Turma *</label>
                <select value={selectedClassId} onChange={e => pickClass(e.target.value)} className={inputCls}>
                  <option value="">Selecione uma turma</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.courseName ? ` — ${c.courseName}` : ''} ({c.students.length})
                    </option>
                  ))}
                </select>
                {classes.length === 0 && (
                  <p className="text-xs text-slate-400 mt-1">Nenhuma turma com alunos cursando.</p>
                )}
              </div>

              {selectedClass && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-xs font-bold text-slate-500">
                      {selectedStudentIds.size} de {selectedClass.students.length} selecionado{selectedStudentIds.size !== 1 ? 's' : ''}
                    </span>
                    <button type="button" onClick={toggleAll} className="text-xs font-bold text-primary hover:underline">
                      {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                    </button>
                  </div>
                  <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedClass.students.map(s => (
                      <label key={s.id} className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.has(s.id)}
                          onChange={() => toggleStudent(s.id)}
                          className="rounded border-slate-300 text-primary focus:ring-primary/30"
                        />
                        <span className="text-slate-700 dark:text-slate-300">{s.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={labelCls}>Descrição *</label>
          <input
            name="description"
            required
            defaultValue={transaction?.description ?? ''}
            className={inputCls}
            placeholder={type === 'RECEITA' ? 'Ex: Taxa da beca, Material didático' : 'Ex: Mensalidade de junho'}
          />
        </div>

        <div>
          <label className={labelCls}>Valor (R$) *</label>
          <input
            name="amount"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={transaction?.amount ?? ''}
            className={inputCls}
            placeholder="0.00"
          />
        </div>

        <div>
          <label className={labelCls}>Vencimento{bulkEnabled && installments > 1 ? ' (1ª parcela) *' : ' *'}</label>
          <input
            name="dueDate"
            type="date"
            required
            defaultValue={toDateInput(transaction?.dueDate)}
            className={inputCls}
          />
        </div>

        {bulkEnabled && (
          <div>
            <label className={labelCls}>Parcelas (meses)</label>
            <input
              name="installments"
              type="number"
              min="1"
              max="60"
              value={installments}
              onChange={e => setInstallments(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className={inputCls}
            />
            {installments > 1 && (
              <p className="text-[11px] text-slate-400 mt-1">{installments} lançamentos mensais por aluno.</p>
            )}
          </div>
        )}

        <div>
          <label className={labelCls}>Categoria</label>
          <select name="categoryId" defaultValue={transaction?.categoryId ?? ''} className={inputCls}>
            <option value="">Sem categoria</option>
            {filteredCategories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Status</label>
          <select name="status" value={status} onChange={e => setStatus(e.target.value)} className={inputCls}>
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
              <label className={labelCls}>Data do Pagamento</label>
              <input
                name="paidAt"
                type="date"
                defaultValue={toDateInput(transaction?.paidAt) || toDateInput(new Date().toISOString())}
                className={inputCls}
              />
            </div>
            {type === 'RECEITA' && (
              <div>
                <label className={labelCls}>Método de Pagamento</label>
                <select name="paymentMethod" defaultValue={transaction?.paymentMethod ?? ''} className={inputCls}>
                  <option value="">Selecione</option>
                  {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            )}
            {type === 'DESPESA' && (
              <>
                <QuickAddSelect
                  label="Forma de Pagamento"
                  name="paymentFormId"
                  initial={paymentForms}
                  initialSelectedId={transaction?.paymentFormId}
                  onCreate={createPaymentForm}
                />
                <QuickAddSelect
                  label="Conta"
                  name="accountId"
                  initial={accounts}
                  initialSelectedId={transaction?.accountId}
                  onCreate={createAccount}
                />
              </>
            )}
          </>
        )}

        {/* Aluno único no modo edição de RECEITA (fora do fluxo de lote) */}
        {type === 'RECEITA' && !bulkEnabled && students.length > 0 && (
          <div>
            <label className={labelCls}>Aluno</label>
            <select name="studentId" defaultValue={transaction?.studentId ?? ''} className={inputCls}>
              <option value="">Nenhum</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        {type === 'DESPESA' && teachers.length > 0 && (
          <div>
            <label className={labelCls}>Professor (opcional)</label>
            <select name="teacherId" defaultValue={transaction?.teacherId ?? ''} className={inputCls}>
              <option value="">Nenhum</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}

        <div className="sm:col-span-2">
          <label className={labelCls}>Observações</label>
          <textarea
            name="notes"
            rows={2}
            defaultValue={transaction?.notes ?? ''}
            className={`${inputCls} resize-none`}
            placeholder="Observações opcionais..."
          />
        </div>
      </div>

      {/* Anexos: só no modo edição (precisa do ID do lançamento salvo) */}
      {isEdit && transaction?.id && (
        <TransactionAttachments transactionId={transaction.id} />
      )}

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
