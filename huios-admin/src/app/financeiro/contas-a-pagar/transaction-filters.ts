interface StatusAndDueDate {
  status: string;
  dueDate: string;
}

function literalDateNumber(date: string): number | null {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getUTCFullYear() * 10_000 + (parsed.getUTCMonth() + 1) * 100 + parsed.getUTCDate();
}

function localDateNumber(date: Date): number {
  return date.getFullYear() * 10_000 + (date.getMonth() + 1) * 100 + date.getDate();
}

export function getEffectiveStatus(transaction: StatusAndDueDate, today = new Date()): string {
  if (transaction.status !== 'PENDENTE') return transaction.status;

  const dueDate = literalDateNumber(transaction.dueDate);
  return dueDate !== null && dueDate < localDateNumber(today) ? 'VENCIDO' : 'PENDENTE';
}

export function matchesStatus(
  transaction: StatusAndDueDate,
  statusFilter: string,
  today = new Date(),
): boolean {
  if (!statusFilter) return true;

  const effectiveStatus = getEffectiveStatus(transaction, today);
  if (statusFilter === 'ABERTO') return effectiveStatus === 'PENDENTE' || effectiveStatus === 'VENCIDO';
  return effectiveStatus === statusFilter;
}

export function matchesMonth(dueDate: string, monthFilter: string): boolean {
  if (!monthFilter) return true;
  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) return false;

  const transactionMonth = `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}`;
  return transactionMonth === monthFilter;
}
