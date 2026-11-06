'use client';

import { useState, useTransition, useMemo } from 'react';
import {
  createTransaction,
  updateTransaction,
  createBulkTransactions,
  createExpenseTransactions,
  createPaymentForm,
  createAccount,
} from './actions';
import {
  simulateExpense,
  type ExpenseMode,
  type ExpenseAmountMode,
  type ExpenseFrequency,
} from './expense-generator';
import TransactionAttachments from './TransactionAttachments';
import { formatDateBR } from '@/lib/date-utils';

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
  reference?: string | null;
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

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function TransactionForm({ type, transaction, categories, students = [], teachers = [], classes = [], paymentForms = [], accounts = [], onSaved }: Props) {
  const isEdit = !!transaction?.id;
  // Recursos de lançamento em lote só no fluxo RECEITA + criação.
  const bulkEnabled = type === 'RECEITA' && !isEdit;

  // Estados gerais
  const [status, setStatus] = useState(transaction?.status ?? 'PENDENTE');
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Estados de Despesa (Parcelada / Recorrente)
  const isExpenseCreation = type === 'DESPESA' && !isEdit;
  const [expenseMode, setExpenseMode] = useState<ExpenseMode>('unica');
  const [expenseInstallments, setExpenseInstallments] = useState(3);
  const [expenseAmountMode, setExpenseAmountMode] = useState<ExpenseAmountMode>('total');
  const [expenseFrequency, setExpenseFrequency] = useState<ExpenseFrequency>('mensal');
  const [firstInstallmentPaid, setFirstInstallmentPaid] = useState(false);

  // dueDate/paidAt podem chegar como Date (vindos do Prisma via RSC) ou string.
  const toDateInput = (value: string | Date | null | undefined) => {
    if (!value) return '';
    const iso = typeof value === 'string' ? value : new Date(value).toISOString();
    return iso.slice(0, 10);
  };

  const [formAmount, setFormAmount] = useState<string>(transaction?.amount != null ? String(transaction.amount) : '');
  const [formDueDate, setFormDueDate] = useState<string>(toDateInput(transaction?.dueDate) || toDateInput(new Date()));

  // Destinatário (RECEITA): individual (aluno único / avulso) ou turma (lote).
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

  // Simulação dinâmica de Despesa em tempo real
  const expenseSimulation = useMemo(() => {
    if (!isExpenseCreation || expenseMode === 'unica') return null;
    const numAmount = parseFloat(formAmount) || 0;
    return simulateExpense({
      amount: numAmount,
      dueDate: formDueDate,
      mode: expenseMode,
      installments: expenseInstallments,
      amountMode: expenseAmountMode,
      frequency: expenseFrequency,
      firstInstallmentPaid,
    });
  }, [isExpenseCreation, expenseMode, formAmount, formDueDate, expenseInstallments, expenseAmountMode, expenseFrequency, firstInstallmentPaid]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    data.set('type', type);

    startTransition(async () => {
      let res: { success: boolean; message: string };

      if (isEdit) {
        res = await updateTransaction(transaction!.id!, null, data);
      } else if (bulkEnabled) {
        // Monta o payload de lote de RECEITA
        data.set('installments', String(Math.max(1, installments)));
        data.delete('studentId');

        if (mode === 'turma') {
          if (!selectedClass) { setResult({ ok: false, msg: 'Selecione uma turma.' }); return; }
          const ids = selectedClass.students.filter(s => selectedStudentIds.has(s.id));
          if (ids.length === 0) { setResult({ ok: false, msg: 'Selecione ao menos um aluno.' }); return; }
          for (const s of ids) data.append('studentIds', s.id);
          const enrollmentMap: Record<string, string> = {};
          for (const s of ids) enrollmentMap[s.id] = s.enrollmentId;
          data.set('enrollmentMap', JSON.stringify(enrollmentMap));
        } else {
          const single = (data.get('individualStudentId') as string) || '';
          data.delete('individualStudentId');
          if (single) data.append('studentIds', single);
        }
        res = await createBulkTransactions(null, data);
      } else if (isExpenseCreation) {
        // DESPESA (criação): suporta única, parcelada e recorrente
        data.set('expenseMode', expenseMode);
        data.set('installments', String(expenseInstallments));
        data.set('amountMode', expenseAmountMode);
        data.set('frequency', expenseFrequency);
        data.set('firstInstallmentPaid', String(firstInstallmentPaid));
        res = await createExpenseTransactions(null, data);
      } else {
        res = await createTransaction(null, data);
      }

      setResult({ ok: res.success, msg: res.message });
      if (res.success) onSaved();
    });
  };

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/30';
  const labelCls = 'block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1';

  // Determina se os campos de quitação devem ser exibidos
  const showPaymentDetails = status === 'PAGO' || (isExpenseCreation && firstInstallmentPaid);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Configuração de Despesa: Única, Parcelada ou Recorrente */}
      {isExpenseCreation && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-4 space-y-4">
          <div>
            <label className={labelCls}>Tipo de Despesa</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { mode: 'unica', label: 'À vista / Única', icon: 'receipt' },
                { mode: 'parcelada', label: 'Parcelada', icon: 'credit_card' },
                { mode: 'recorrente', label: 'Recorrente (Fixa)', icon: 'autorenew' },
              ] as const).map(item => (
                <button
                  key={item.mode}
                  type="button"
                  onClick={() => {
                    setExpenseMode(item.mode);
                    if (item.mode === 'parcelada' && expenseInstallments < 2) setExpenseInstallments(3);
                    if (item.mode === 'recorrente' && expenseInstallments < 2) setExpenseInstallments(12);
                  }}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all ${
                    expenseMode === item.mode
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Opções de Despesa Parcelada */}
          {expenseMode === 'parcelada' && (
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Número de Parcelas</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="2"
                      max="72"
                      value={expenseInstallments}
                      onChange={e => setExpenseInstallments(Math.max(2, parseInt(e.target.value, 10) || 2))}
                      className={inputCls}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[2, 3, 4, 5, 6, 10, 12, 24].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setExpenseInstallments(num)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors ${
                          expenseInstallments === num
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'border-slate-200 dark:border-slate-700 hover:border-primary text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800'
                        }`}
                      >
                        {num}x
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Forma de Distribuição do Valor</label>
                  <div className="flex flex-col gap-2">
                    <label className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                      expenseAmountMode === 'total'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}>
                      <input
                        type="radio"
                        name="amountModeChoice"
                        checked={expenseAmountMode === 'total'}
                        onChange={() => setExpenseAmountMode('total')}
                        className="text-primary focus:ring-primary/30"
                      />
                      <div>
                        <span className="font-bold">Valor Total da Compra</span>
                        <p className="text-[11px] text-slate-400">O sistema divide o valor total pelas {expenseInstallments} parcelas</p>
                      </div>
                    </label>

                    <label className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                      expenseAmountMode === 'parcela'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}>
                      <input
                        type="radio"
                        name="amountModeChoice"
                        checked={expenseAmountMode === 'parcela'}
                        onChange={() => setExpenseAmountMode('parcela')}
                        className="text-primary focus:ring-primary/30"
                      />
                      <div>
                        <span className="font-bold">Valor de Cada Parcela</span>
                        <p className="text-[11px] text-slate-400">Cada uma das {expenseInstallments} parcelas terá o valor digitado</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={firstInstallmentPaid}
                    onChange={e => setFirstInstallmentPaid(e.target.checked)}
                    className="rounded border-slate-300 text-primary focus:ring-primary/30"
                  />
                  <span>1ª parcela já foi paga no ato (as demais ficarão pendentes)</span>
                </label>
              </div>
            </div>
          )}

          {/* Opções de Despesa Recorrente */}
          {expenseMode === 'recorrente' && (
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Periodicidade</label>
                  <select
                    value={expenseFrequency}
                    onChange={e => setExpenseFrequency(e.target.value as ExpenseFrequency)}
                    className={inputCls}
                  >
                    <option value="mensal">Mensal (todo mês)</option>
                    <option value="quinzenal">Quinzenal (a cada 15 dias)</option>
                    <option value="semanal">Semanal (toda semana)</option>
                    <option value="anual">Anual (uma vez por ano)</option>
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Repetições a Provisionar</label>
                  <input
                    type="number"
                    min="2"
                    max="60"
                    value={expenseInstallments}
                    onChange={e => setExpenseInstallments(Math.max(2, parseInt(e.target.value, 10) || 2))}
                    className={inputCls}
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[
                      { count: 3, label: '3 vezes' },
                      { count: 6, label: '6 meses' },
                      { count: 12, label: '12 meses (1 ano)' },
                      { count: 24, label: '24 meses (2 anos)' },
                    ].map(item => (
                      <button
                        key={item.count}
                        type="button"
                        onClick={() => setExpenseInstallments(item.count)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors ${
                          expenseInstallments === item.count
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'border-slate-200 dark:border-slate-700 hover:border-primary text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={firstInstallmentPaid}
                    onChange={e => setFirstInstallmentPaid(e.target.checked)}
                    className="rounded border-slate-300 text-primary focus:ring-primary/30"
                  />
                  <span>1ª ocorrência já foi paga (as demais ficarão pendentes)</span>
                </label>
              </div>
            </div>
          )}

          {/* Card de Simulação e Previsão em Tempo Real */}
          {expenseSimulation && (
            <div className="rounded-xl p-3.5 bg-primary/5 dark:bg-primary/10 border border-primary/20 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-primary">
                <span className="material-symbols-outlined text-base">
                  {expenseMode === 'parcelada' ? 'calculate' : 'autorenew'}
                </span>
                <span>{expenseMode === 'parcelada' ? 'Simulação das Parcelas' : 'Previsão da Recorrência'}</span>
              </div>
              <p className="text-slate-700 dark:text-slate-200">
                Serão geradas <strong>{expenseSimulation.count} despesas</strong>:{' '}
                {expenseMode === 'parcelada' && expenseAmountMode === 'total' && expenseSimulation.hasCentsAdjustment ? (
                  <span>
                    1ª de <strong>{fmtBRL(expenseSimulation.firstInstallmentAmount)}</strong> e {expenseSimulation.count - 1} de{' '}
                    <strong>{fmtBRL(expenseSimulation.installmentAmount)}</strong>
                  </span>
                ) : (
                  <span>
                    de <strong>{fmtBRL(expenseSimulation.installmentAmount)}</strong> cada
                  </span>
                )}{' '}
                (Total: <strong>{fmtBRL(expenseSimulation.totalAmount)}</strong>).
              </p>
              {expenseSimulation.firstDueDate && expenseSimulation.lastDueDate && (
                <p className="text-slate-500 dark:text-slate-400">
                  Período: de <strong>{formatDateBR(expenseSimulation.firstDueDate)}</strong> até{' '}
                  <strong>{formatDateBR(expenseSimulation.lastDueDate)}</strong>.
                </p>
              )}
              {firstInstallmentPaid && (
                <p className="text-emerald-600 dark:text-emerald-400 font-bold">
                  ✓ 1ª despesa será gravada como PAGA e as outras {expenseSimulation.count - 1} como PENDENTES.
                </p>
              )}
            </div>
          )}
        </div>
      )}

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
            placeholder={
              type === 'RECEITA'
                ? 'Ex: Taxa da beca, Material didático'
                : expenseMode === 'parcelada'
                ? 'Ex: Compra de Computador'
                : expenseMode === 'recorrente'
                ? 'Ex: Aluguel da Sede, Provedor de Internet'
                : 'Ex: Compra de Material, Conserto de Ar'
            }
          />
        </div>

        <div>
          <label className={labelCls}>
            {type === 'DESPESA' && isExpenseCreation && expenseMode === 'parcelada'
              ? expenseAmountMode === 'total'
                ? 'Valor Total da Compra (R$) *'
                : 'Valor de Cada Parcela (R$) *'
              : type === 'DESPESA' && isExpenseCreation && expenseMode === 'recorrente'
              ? 'Valor de Cada Ocorrência (R$) *'
              : 'Valor (R$) *'}
          </label>
          <input
            name="amount"
            type="number"
            min="0"
            step="0.01"
            required
            value={formAmount}
            onChange={e => setFormAmount(e.target.value)}
            className={inputCls}
            placeholder="0.00"
          />
        </div>

        <div>
          <label className={labelCls}>
            {isExpenseCreation && expenseMode !== 'unica'
              ? '1º Vencimento *'
              : bulkEnabled && installments > 1
              ? 'Vencimento (1ª parcela) *'
              : 'Vencimento *'}
          </label>
          <input
            name="dueDate"
            type="date"
            required
            value={formDueDate}
            onChange={e => setFormDueDate(e.target.value)}
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
          {isExpenseCreation && firstInstallmentPaid ? (
            <div>
              <div className="px-3 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-sm font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">check_circle</span>
                1ª Paga e demais Pendentes
              </div>
              <input type="hidden" name="status" value="PENDENTE" />
            </div>
          ) : (
            <select name="status" value={status} onChange={e => setStatus(e.target.value)} className={inputCls}>
              <option value="PENDENTE">Pendente</option>
              <option value="PAGO">Pago</option>
              <option value="VENCIDO">Vencido</option>
              <option value="CANCELADO">Cancelado</option>
              <option value="ISENTO">Isento</option>
            </select>
          )}
        </div>

        {showPaymentDetails && (
          <>
            <div>
              <label className={labelCls}>
                {isExpenseCreation && firstInstallmentPaid ? 'Data do Pagamento (1ª Parcela)' : 'Data do Pagamento'}
              </label>
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
                  label="Conta de Origem"
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
            <label className={labelCls}>Beneficiário / Professor (opcional)</label>
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
          {isPending
            ? 'Salvando...'
            : isEdit
            ? 'Salvar Alterações'
            : isExpenseCreation && expenseMode === 'parcelada'
            ? `Criar ${expenseInstallments} Parcelas`
            : isExpenseCreation && expenseMode === 'recorrente'
            ? `Criar ${expenseInstallments} Despesas`
            : 'Criar Lançamento'}
        </button>
      </div>
    </form>
  );
}
