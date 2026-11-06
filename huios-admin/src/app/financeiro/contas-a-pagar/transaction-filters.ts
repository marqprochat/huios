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

export function parseCurrencyQuery(raw: string): { value: number | null; hasDecimals: boolean } {
  let s = raw.trim().replace(/^r\$\s*/i, '').trim();
  if (!s) return { value: null, hasDecimals: false };

  // Com vírgula (padrão brasileiro, ex: 150,50 ou 1.500,00)
  if (s.includes(',')) {
    const withoutThousands = s.replace(/\./g, '');
    const normalized = withoutThousands.replace(',', '.');
    const n = parseFloat(normalized);
    return { value: isNaN(n) ? null : n, hasDecimals: true };
  }

  // Com ponto
  if (s.includes('.')) {
    const parts = s.split('.');
    // Milhar brasileiro sem centavos (ex: "1.500")
    if (parts.length === 2 && parts[1].length === 3 && parseInt(parts[0], 10) < 1000) {
      const n = parseFloat(parts[0] + parts[1]);
      return { value: isNaN(n) ? null : n, hasDecimals: false };
    }
    // Decimal internacional (ex: 150.50)
    const n = parseFloat(s);
    return { value: isNaN(n) ? null : n, hasDecimals: true };
  }

  const n = parseFloat(s);
  return { value: isNaN(n) ? null : n, hasDecimals: false };
}

export function matchesAmount(amount: number, filter: string): boolean {
  const q = filter.trim();
  if (!q) return true;

  // Faixa de valores: "100 - 500" ou "100 a 500"
  const rangeMatch = q.match(/^([^\s]+)\s*(?:-|a|até)\s*([^\s]+)$/i);
  if (rangeMatch) {
    const min = parseCurrencyQuery(rangeMatch[1]).value;
    const max = parseCurrencyQuery(rangeMatch[2]).value;
    if (min !== null && max !== null) {
      return amount >= min && amount <= max;
    }
  }

  // Operadores: >=, <=, >, <, =
  const opMatch = q.match(/^(>=|<=|>|<|=)\s*(.+)$/);
  if (opMatch) {
    const op = opMatch[1];
    const val = parseCurrencyQuery(opMatch[2]).value;
    if (val !== null) {
      if (op === '>=') return amount >= val - 0.001;
      if (op === '<=') return amount <= val + 0.001;
      if (op === '>') return amount > val;
      if (op === '<') return amount < val;
      if (op === '=') return Math.abs(amount - val) < 0.01;
    }
  }

  // Valor numérico direto
  const parsed = parseCurrencyQuery(q);
  if (parsed.value !== null) {
    // Correspondência exata (tolerância de 1 centavo)
    if (Math.abs(amount - parsed.value) < 0.01) return true;

    // Se digitou sem decimais (ex: "150"), aceita a faixa inteira (ex: 150,50)
    if (!parsed.hasDecimals && Math.floor(amount) === Math.floor(parsed.value)) {
      return true;
    }
  }

  // Correspondência por digitação parcial com decimais (ex: "150," ou "150.5")
  const cleanQ = q.replace(/^r\$\s*/i, '').trim().toLowerCase();
  if (cleanQ.includes(',') || cleanQ.includes('.')) {
    const strBR = amount.toFixed(2).replace('.', ',');
    const strDot = amount.toFixed(2);
    const strLocale = amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    if (strBR.startsWith(cleanQ) || strDot.startsWith(cleanQ) || strLocale.startsWith(cleanQ)) {
      return true;
    }
  }

  return false;
}
