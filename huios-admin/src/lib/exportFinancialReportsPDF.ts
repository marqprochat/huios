import { exportReportPDF, REPORT_COLORS } from './pdf/reportPDF.ts';
import { formatDateBR } from './date-utils.ts';

export interface MonthlyFinancialRow {
  month: string;
  receita: number;
  despesa: number;
  saldo: number;
}

export interface DefaulterFinancialRow {
  studentName: string;
  studentId?: string;
  description: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
}

export interface CategoryFinancialRow {
  category: string;
  type: string;
  total: number;
}

export interface PayableFinancialRow {
  description: string;
  category?: { name: string } | null;
  teacher?: { name: string } | null;
  amount: number;
  dueDate: string;
  status: string;
  paidAt?: string | null;
}

export interface ReceivableFinancialRow {
  description: string;
  category?: { name: string } | null;
  student?: { name: string } | null;
  enrollment?: { class?: { course?: { name: string } | null } | null } | null;
  amount: number;
  dueDate: string;
  status: string;
  paidAt?: string | null;
}

export interface FinancialTotals {
  pendente: number;
  pago: number;
  vencido: number;
}

export interface FinancialFilters {
  status?: string;
  month?: string;
  search?: string;
}

const fmtCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS_LABELS: Record<string, string> = {
  ABERTO: 'Em aberto',
  PENDENTE: 'Pendente',
  PAGO: 'Pago',
  VENCIDO: 'Vencido',
  CANCELADO: 'Cancelado',
  ISENTO: 'Isento',
};

/**
 * Exporta o Relatório Financeiro de Resumo Mensal em PDF.
 */
export async function exportMonthlyFinancialReportPDF(options: {
  startMonth?: string;
  endMonth?: string;
  rows: MonthlyFinancialRow[];
  generatedAt?: Date;
}): Promise<void> {
  const totalReceitas = options.rows.reduce((sum, r) => sum + r.receita, 0);
  const totalDespesas = options.rows.reduce((sum, r) => sum + r.despesa, 0);
  const saldoTotal = totalReceitas - totalDespesas;
  const mediaMensal = options.rows.length > 0 ? saldoTotal / options.rows.length : 0;

  await exportReportPDF({
    title: 'Relatório Financeiro — Resumo Mensal',
    subtitle: 'Demonstrativo consolidado de receitas, despesas e saldo mensal',
    fileName: 'relatorio-financeiro-mensal',
    generatedAt: options.generatedAt ?? new Date(),
    filters: [
      { label: 'Mês Inicial', value: options.startMonth || 'Todos' },
      { label: 'Mês Final', value: options.endMonth || 'Todos' },
      { label: 'Total de Meses', value: options.rows.length },
    ],
    metrics: [
      { label: 'Total Receitas', value: fmtCurrency(totalReceitas), color: REPORT_COLORS.green },
      { label: 'Total Despesas', value: fmtCurrency(totalDespesas), color: REPORT_COLORS.red },
      {
        label: 'Saldo Geral',
        value: fmtCurrency(saldoTotal),
        color: saldoTotal >= 0 ? REPORT_COLORS.green : REPORT_COLORS.red,
      },
      {
        label: 'Média Saldo/Mês',
        value: fmtCurrency(mediaMensal),
        color: mediaMensal >= 0 ? REPORT_COLORS.blue : REPORT_COLORS.amber,
      },
    ],
    sections: [
      {
        kind: 'table',
        head: ['Mês', 'Receitas', 'Despesas', 'Saldo'],
        body: [
          ...options.rows.map(r => [
            r.month,
            fmtCurrency(r.receita),
            fmtCurrency(r.despesa),
            fmtCurrency(r.saldo),
          ]),
          ...(options.rows.length > 0
            ? [
                [
                  'TOTAL DO PERÍODO',
                  fmtCurrency(totalReceitas),
                  fmtCurrency(totalDespesas),
                  fmtCurrency(saldoTotal),
                ],
              ]
            : []),
        ],
        columnStyles: {
          0: { cellWidth: 50 },
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right' },
        },
      },
    ],
  });
}

/**
 * Exporta o Relatório de Inadimplência em PDF.
 */
export async function exportDefaultersReportPDF(options: {
  startMonth?: string;
  endMonth?: string;
  rows: DefaulterFinancialRow[];
  generatedAt?: Date;
}): Promise<void> {
  const totalAmount = options.rows.reduce((sum, r) => sum + r.amount, 0);
  const avgAmount = options.rows.length > 0 ? totalAmount / options.rows.length : 0;
  const maxDays = options.rows.reduce((max, r) => Math.max(max, r.daysOverdue), 0);
  const uniqueStudents = new Set(options.rows.map(r => r.studentName)).size;

  await exportReportPDF({
    title: 'Relatório Financeiro — Inadimplência',
    subtitle: 'Alunos com cobranças vencidas e pendentes de regularização',
    fileName: 'relatorio-inadimplencia',
    generatedAt: options.generatedAt ?? new Date(),
    filters: [
      { label: 'Mês Inicial', value: options.startMonth || 'Todos' },
      { label: 'Mês Final', value: options.endMonth || 'Todos' },
      { label: 'Cobranças Vencidas', value: options.rows.length },
    ],
    metrics: [
      { label: 'Alunos Inadimplentes', value: uniqueStudents, color: REPORT_COLORS.slate },
      { label: 'Total em Atraso', value: fmtCurrency(totalAmount), color: REPORT_COLORS.red },
      { label: 'Média por Débito', value: fmtCurrency(avgAmount), color: REPORT_COLORS.amber },
      { label: 'Maior Atraso', value: `${maxDays} dias`, color: REPORT_COLORS.red },
    ],
    sections: [
      {
        kind: 'table',
        head: ['Aluno', 'Descrição', 'Valor', 'Vencimento', 'Dias em Atraso'],
        body: [
          ...options.rows.map(r => [
            r.studentName,
            r.description,
            fmtCurrency(r.amount),
            formatDateBR(r.dueDate),
            `${r.daysOverdue} dias`,
          ]),
          ...(options.rows.length > 0
            ? [
                [
                  'TOTAL EM ATRASO',
                  `${options.rows.length} cobrança(s)`,
                  fmtCurrency(totalAmount),
                  '',
                  '',
                ],
              ]
            : []),
        ],
        columnStyles: {
          2: { halign: 'right', cellWidth: 35 },
          3: { halign: 'center', cellWidth: 28 },
          4: { halign: 'center', cellWidth: 28 },
        },
      },
    ],
  });
}

/**
 * Exporta o Relatório Financeiro por Categoria em PDF.
 */
export async function exportCategoryFinancialReportPDF(options: {
  startMonth?: string;
  endMonth?: string;
  rows: CategoryFinancialRow[];
  generatedAt?: Date;
}): Promise<void> {
  const totalReceitas = options.rows
    .filter(r => r.type === 'RECEITA')
    .reduce((sum, r) => sum + r.total, 0);
  const totalDespesas = options.rows
    .filter(r => r.type !== 'RECEITA')
    .reduce((sum, r) => sum + r.total, 0);
  const saldoLiquido = totalReceitas - totalDespesas;

  await exportReportPDF({
    title: 'Relatório Financeiro — Por Categoria',
    subtitle: 'Distribuição dos lançamentos agrupados por categoria financeira',
    fileName: 'relatorio-por-categoria',
    generatedAt: options.generatedAt ?? new Date(),
    filters: [
      { label: 'Mês Inicial', value: options.startMonth || 'Todos' },
      { label: 'Mês Final', value: options.endMonth || 'Todos' },
      { label: 'Categorias Listadas', value: options.rows.length },
    ],
    metrics: [
      { label: 'Total Receitas', value: fmtCurrency(totalReceitas), color: REPORT_COLORS.green },
      { label: 'Total Despesas', value: fmtCurrency(totalDespesas), color: REPORT_COLORS.red },
      {
        label: 'Saldo Líquido',
        value: fmtCurrency(saldoLiquido),
        color: saldoLiquido >= 0 ? REPORT_COLORS.green : REPORT_COLORS.red,
      },
      { label: 'Categorias Ativas', value: options.rows.length, color: REPORT_COLORS.slate },
    ],
    sections: [
      {
        kind: 'table',
        head: ['Categoria', 'Tipo', 'Total'],
        body: options.rows.map(r => [
          r.category,
          r.type === 'RECEITA' ? 'Receita' : 'Despesa',
          fmtCurrency(r.total),
        ]),
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { halign: 'center', cellWidth: 40 },
          2: { halign: 'right', cellWidth: 50 },
        },
      },
    ],
  });
}

/**
 * Exporta o Relatório de Contas a Pagar em PDF.
 */
export async function exportPayablesReportPDF(options: {
  filters?: FinancialFilters;
  totals: FinancialTotals;
  rows: PayableFinancialRow[];
  generatedAt?: Date;
}): Promise<void> {
  await exportReportPDF({
    title: 'Relatório de Contas a Pagar',
    subtitle: 'Listagem de despesas e obrigações a pagar',
    fileName: 'relatorio-contas-a-pagar',
    generatedAt: options.generatedAt ?? new Date(),
    filters: [
      {
        label: 'Status',
        value: options.filters?.status
          ? STATUS_LABELS[options.filters.status] ?? options.filters.status
          : 'Todos',
      },
      { label: 'Mês de Vencimento', value: options.filters?.month || 'Todos' },
      { label: 'Busca', value: options.filters?.search?.trim() || 'Todas' },
    ],
    metrics: [
      { label: 'A Pagar', value: fmtCurrency(options.totals.pendente), color: REPORT_COLORS.amber },
      { label: 'Pago', value: fmtCurrency(options.totals.pago), color: REPORT_COLORS.green },
      { label: 'Vencido', value: fmtCurrency(options.totals.vencido), color: REPORT_COLORS.red },
      { label: 'Lançamentos', value: options.rows.length, color: REPORT_COLORS.slate },
    ],
    sections: [
      {
        kind: 'table',
        head: ['Descrição', 'Categoria', 'Favorecido / Prof.', 'Valor', 'Vencimento', 'Status', 'Pago Em'],
        body: options.rows.map(t => [
          t.description,
          t.category?.name ?? '—',
          t.teacher?.name ?? '—',
          fmtCurrency(t.amount),
          formatDateBR(t.dueDate),
          STATUS_LABELS[t.status] ?? t.status,
          t.paidAt ? formatDateBR(t.paidAt) : '—',
        ]),
        columnStyles: {
          3: { halign: 'right', cellWidth: 32 },
          4: { halign: 'center', cellWidth: 26 },
          5: { halign: 'center', cellWidth: 26 },
          6: { halign: 'center', cellWidth: 26 },
        },
      },
    ],
  });
}

/**
 * Exporta o Relatório de Contas a Receber em PDF.
 */
export async function exportReceivablesReportPDF(options: {
  filters?: FinancialFilters;
  totals: FinancialTotals;
  rows: ReceivableFinancialRow[];
  generatedAt?: Date;
}): Promise<void> {
  await exportReportPDF({
    title: 'Relatório de Contas a Receber',
    subtitle: 'Listagem de mensalidades e valores a receber',
    fileName: 'relatorio-contas-a-receber',
    generatedAt: options.generatedAt ?? new Date(),
    filters: [
      {
        label: 'Status',
        value: options.filters?.status
          ? STATUS_LABELS[options.filters.status] ?? options.filters.status
          : 'Todos',
      },
      { label: 'Mês de Vencimento', value: options.filters?.month || 'Todos' },
      { label: 'Busca', value: options.filters?.search?.trim() || 'Todas' },
    ],
    metrics: [
      { label: 'A Receber', value: fmtCurrency(options.totals.pendente), color: REPORT_COLORS.amber },
      { label: 'Recebido', value: fmtCurrency(options.totals.pago), color: REPORT_COLORS.green },
      { label: 'Vencido', value: fmtCurrency(options.totals.vencido), color: REPORT_COLORS.red },
      { label: 'Cobranças', value: options.rows.length, color: REPORT_COLORS.slate },
    ],
    sections: [
      {
        kind: 'table',
        head: ['Aluno', 'Curso', 'Descrição', 'Categoria', 'Valor', 'Vencimento', 'Status', 'Pago Em'],
        body: options.rows.map(t => [
          t.student?.name ?? '—',
          t.enrollment?.class?.course?.name ?? '—',
          t.description,
          t.category?.name ?? '—',
          fmtCurrency(t.amount),
          formatDateBR(t.dueDate),
          STATUS_LABELS[t.status] ?? t.status,
          t.paidAt ? formatDateBR(t.paidAt) : '—',
        ]),
        columnStyles: {
          4: { halign: 'right', cellWidth: 30 },
          5: { halign: 'center', cellWidth: 26 },
          6: { halign: 'center', cellWidth: 26 },
          7: { halign: 'center', cellWidth: 26 },
        },
      },
    ],
  });
}
