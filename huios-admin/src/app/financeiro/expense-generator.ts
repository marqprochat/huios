import { addCivilMonths, addCivilDays, parseCivilDate } from '../../lib/date-utils.ts';

export type ExpenseMode = 'unica' | 'parcelada' | 'recorrente';
export type ExpenseAmountMode = 'total' | 'parcela';
export type ExpenseFrequency = 'mensal' | 'quinzenal' | 'semanal' | 'anual';

export interface ExpenseGenerationParams {
  description: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  mode?: ExpenseMode;
  installments?: number; // count of installments or repetitions
  amountMode?: ExpenseAmountMode;
  frequency?: ExpenseFrequency;
  firstInstallmentPaid?: boolean;
  status?: string;
  paidAt?: string | null;
  paymentMethod?: string | null;
  paymentFormId?: string | null;
  accountId?: string | null;
  categoryId?: string | null;
  teacherId?: string | null;
  notes?: string | null;
  referencePrefix?: string;
}

export interface GeneratedExpenseRow {
  type: 'DESPESA';
  description: string;
  amount: number;
  dueDate: Date;
  status: string;
  paidAt: Date | null;
  paymentMethod: string | null;
  paymentFormId: string | null;
  accountId: string | null;
  categoryId: string | null;
  teacherId: string | null;
  notes: string | null;
  reference: string | null;
}

export interface ExpenseSimulationResult {
  count: number;
  totalAmount: number;
  installmentAmount: number;
  hasCentsAdjustment: boolean;
  firstInstallmentAmount: number;
  firstDueDate: Date | null;
  lastDueDate: Date | null;
  summaryText: string;
}

/**
 * Calcula a data de vencimento da n-ésima ocorrência baseado na frequência.
 */
export function calculateDueDate(baseDate: Date, index: number, frequency: ExpenseFrequency = 'mensal'): Date {
  if (index === 0) return baseDate;
  switch (frequency) {
    case 'semanal':
      return addCivilDays(baseDate, index * 7);
    case 'quinzenal':
      return addCivilDays(baseDate, index * 14);
    case 'anual':
      return addCivilMonths(baseDate, index * 12);
    case 'mensal':
    default:
      return addCivilMonths(baseDate, index);
  }
}

/**
 * Simula os valores e datas para exibição em tempo real na interface.
 */
export function simulateExpense(params: {
  amount: number;
  dueDate: string;
  mode: ExpenseMode;
  installments: number;
  amountMode?: ExpenseAmountMode;
  frequency?: ExpenseFrequency;
  firstInstallmentPaid?: boolean;
}): ExpenseSimulationResult {
  const mode = params.mode || 'unica';
  const rawAmount = Math.max(0, isNaN(params.amount) ? 0 : params.amount);
  const count = mode === 'unica' ? 1 : Math.max(2, params.installments || 2);
  const amountMode = params.amountMode || 'total';
  const frequency = params.frequency || 'mensal';
  const baseDate = parseCivilDate(params.dueDate);

  if (mode === 'unica') {
    return {
      count: 1,
      totalAmount: rawAmount,
      installmentAmount: rawAmount,
      hasCentsAdjustment: false,
      firstInstallmentAmount: rawAmount,
      firstDueDate: baseDate,
      lastDueDate: baseDate,
      summaryText: 'Lançamento único.',
    };
  }

  let totalAmount = 0;
  let installmentAmount = 0;
  let firstInstallmentAmount = 0;
  let hasCentsAdjustment = false;

  if (mode === 'parcelada') {
    if (amountMode === 'total') {
      totalAmount = Math.round(rawAmount * 100) / 100;
      const totalInCents = Math.round(totalAmount * 100);
      const basePerParcel = Math.floor(totalInCents / count);
      const remainder = totalInCents - (basePerParcel * count);
      hasCentsAdjustment = remainder > 0;
      installmentAmount = basePerParcel / 100;
      firstInstallmentAmount = (basePerParcel + (remainder > 0 ? 1 : 0)) / 100;
    } else {
      installmentAmount = Math.round(rawAmount * 100) / 100;
      firstInstallmentAmount = installmentAmount;
      totalAmount = Math.round(installmentAmount * count * 100) / 100;
    }
  } else {
    // Recorrente: valor informado é o valor de cada repetição
    installmentAmount = Math.round(rawAmount * 100) / 100;
    firstInstallmentAmount = installmentAmount;
    totalAmount = Math.round(installmentAmount * count * 100) / 100;
  }

  const lastDate = baseDate ? calculateDueDate(baseDate, count - 1, frequency) : null;

  return {
    count,
    totalAmount,
    installmentAmount,
    hasCentsAdjustment,
    firstInstallmentAmount,
    firstDueDate: baseDate,
    lastDueDate: lastDate,
    summaryText: mode === 'parcelada'
      ? `${count} parcelas no total`
      : `${count} ocorrências ${frequency}s`,
  };
}

/**
 * Gera o array de linhas de FinancialTransaction pronto para inserção no banco.
 */
export function generateExpenseInstallments(params: ExpenseGenerationParams): GeneratedExpenseRow[] {
  const mode = params.mode || 'unica';
  const baseDueDate = parseCivilDate(params.dueDate) || new Date();
  const rawAmount = Math.max(0, params.amount);
  const status = params.status || 'PENDENTE';
  const paymentMethod = params.paymentMethod || null;
  const paymentFormId = params.paymentFormId || null;
  const accountId = params.accountId || null;
  const categoryId = params.categoryId || null;
  const teacherId = params.teacherId || null;
  const notes = params.notes || null;
  const paidAtDate = params.paidAt ? parseCivilDate(params.paidAt) : null;

  if (mode === 'unica') {
    const isPaid = status === 'PAGO';
    return [{
      type: 'DESPESA',
      description: params.description.trim(),
      amount: Math.round(rawAmount * 100) / 100,
      dueDate: baseDueDate,
      status,
      paidAt: isPaid ? (paidAtDate || baseDueDate) : null,
      paymentMethod: isPaid ? paymentMethod : null,
      paymentFormId,
      accountId,
      categoryId,
      teacherId,
      notes,
      reference: null,
    }];
  }

  const count = Math.max(2, params.installments || 2);
  const amountMode = params.amountMode || 'total';
  const frequency = params.frequency || 'mensal';
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  const ref = params.referencePrefix || `${mode === 'parcelada' ? 'PARC' : 'REC'}-${Date.now().toString(36)}-${randomSuffix}`;

  const rows: GeneratedExpenseRow[] = [];

  let baseCents = 0;
  let remainderCents = 0;

  if (mode === 'parcelada' && amountMode === 'total') {
    const totalInCents = Math.round(rawAmount * 100);
    baseCents = Math.floor(totalInCents / count);
    remainderCents = totalInCents - (baseCents * count);
  } else {
    baseCents = Math.round(rawAmount * 100);
    remainderCents = 0;
  }

  for (let i = 0; i < count; i++) {
    const dueDate = calculateDueDate(baseDueDate, i, frequency);
    const itemAmount = (baseCents + (i < remainderCents ? 1 : 0)) / 100;
    const desc = `${params.description.trim()} (${i + 1}/${count})`;

    const isFirstPaid = (params.firstInstallmentPaid || status === 'PAGO') && i === 0;
    const rowStatus = isFirstPaid ? 'PAGO' : (status === 'PAGO' ? 'PENDENTE' : status);
    const rowPaidAt = isFirstPaid ? (paidAtDate || baseDueDate) : null;

    rows.push({
      type: 'DESPESA',
      description: desc,
      amount: itemAmount,
      dueDate,
      status: rowStatus,
      paidAt: rowPaidAt,
      paymentMethod: isFirstPaid ? paymentMethod : null,
      paymentFormId,
      accountId,
      categoryId,
      teacherId,
      notes,
      reference: ref,
    });
  }

  return rows;
}
