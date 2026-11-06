import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test, { after } from 'node:test';

import {
  exportMonthlyFinancialReportPDF,
  exportDefaultersReportPDF,
  exportCategoryFinancialReportPDF,
  exportPayablesReportPDF,
  exportReceivablesReportPDF,
} from './exportFinancialReportsPDF.ts';

const cleanupPdfs = () => {
  const dir = process.cwd();
  const files = fs.readdirSync(dir);
  for (const f of files) {
    if (f.startsWith('relatorio-') && f.endsWith('.pdf')) {
      try {
        fs.unlinkSync(path.join(dir, f));
      } catch {}
    }
  }
};

after(cleanupPdfs);

test('exportMonthlyFinancialReportPDF executes without crashing and handles rows', async () => {
  let savedFile: string | null = null;
  // In Node environment, jsPDF doc.save writes to file or buffers
  await assert.doesNotReject(async () => {
    await exportMonthlyFinancialReportPDF({
      startMonth: '2026-01',
      endMonth: '2026-06',
      rows: [
        { month: '2026-01', receita: 15000, despesa: 10000, saldo: 5000 },
        { month: '2026-02', receita: 18000, despesa: 12000, saldo: 6000 },
      ],
      generatedAt: new Date(2026, 6, 1, 10, 0, 0),
    });
  });
});

test('exportDefaultersReportPDF executes without crashing with defaulter data', async () => {
  await assert.doesNotReject(async () => {
    await exportDefaultersReportPDF({
      startMonth: '2026-01',
      endMonth: '2026-06',
      rows: [
        {
          studentName: 'João Silva',
          studentId: 'std-1',
          description: 'Mensalidade Maio/2026',
          amount: 350,
          dueDate: '2026-05-10T00:00:00.000Z',
          daysOverdue: 25,
        },
      ],
      generatedAt: new Date(2026, 6, 1, 10, 0, 0),
    });
  });
});

test('exportCategoryFinancialReportPDF executes without crashing with category data', async () => {
  await assert.doesNotReject(async () => {
    await exportCategoryFinancialReportPDF({
      rows: [
        { category: 'Mensalidades', type: 'RECEITA', total: 50000 },
        { category: 'Salários', type: 'DESPESA', total: 30000 },
      ],
      generatedAt: new Date(2026, 6, 1, 10, 0, 0),
    });
  });
});

test('exportPayablesReportPDF executes without crashing with payables data', async () => {
  await assert.doesNotReject(async () => {
    await exportPayablesReportPDF({
      filters: { status: 'PENDENTE', month: '2026-07', search: 'Energia' },
      totals: { pendente: 1200, pago: 5000, vencido: 0 },
      rows: [
        {
          description: 'Conta de Energia Elétrica',
          category: { name: 'Infraestrutura' },
          teacher: null,
          amount: 1200,
          dueDate: '2026-07-20T00:00:00.000Z',
          status: 'PENDENTE',
          paidAt: null,
        },
      ],
      generatedAt: new Date(2026, 6, 1, 10, 0, 0),
    });
  });
});

test('exportReceivablesReportPDF executes without crashing with receivables data', async () => {
  await assert.doesNotReject(async () => {
    await exportReceivablesReportPDF({
      filters: { status: 'PAGO', month: '2026-07', search: '' },
      totals: { pendente: 0, pago: 450, vencido: 0 },
      rows: [
        {
          student: { name: 'Maria Souza' },
          enrollment: { class: { course: { name: 'Teologia Básica' } } },
          description: 'Mensalidade Julho/2026',
          category: { name: 'Mensalidade' },
          amount: 450,
          dueDate: '2026-07-15T00:00:00.000Z',
          status: 'PAGO',
          paidAt: '2026-07-14T10:00:00.000Z',
        },
      ],
      generatedAt: new Date(2026, 6, 1, 10, 0, 0),
    });
  });
});

test('large financial reports generate compressed and lightweight PDF files', async () => {
  const generatedAt = new Date(2026, 6, 1, 10, 0, 0);
  const rows = Array.from({ length: 150 }, (_, i) => ({
    student: { name: `Aluno Teste Sobrenome Longo ${i}` },
    enrollment: { class: { course: { name: 'Curso de Liderança e Teologia Pastoral Avançada' } } },
    description: `Mensalidade Parcela ${i + 1}/12 - Ano Letivo 2026`,
    category: { name: 'Mensalidades Regulares' },
    amount: 350 + (i % 50),
    dueDate: '2026-07-10T00:00:00.000Z',
    status: i % 3 === 0 ? 'PAGO' : i % 3 === 1 ? 'PENDENTE' : 'VENCIDO',
    paidAt: i % 3 === 0 ? '2026-07-09T10:00:00.000Z' : null,
  }));

  await exportReceivablesReportPDF({
    filters: { status: 'Todos', month: '2026-07', search: '' },
    totals: { pendente: 20000, pago: 30000, vencido: 5000 },
    rows,
    generatedAt,
  });

  const expectedFileName = 'relatorio-contas-a-receber-2026-07-01.pdf';
  const filePath = path.join(process.cwd(), expectedFileName);

  assert.ok(fs.existsSync(filePath), 'O arquivo PDF gerado deve existir');
  const stats = fs.statSync(filePath);
  // 150 linhas em múltiplas páginas com streams comprimidos deve ficar bem abaixo de 50KB
  assert.ok(
    stats.size < 50 * 1024,
    `O arquivo PDF com 150 linhas (${stats.size} bytes) deve ser compacto (< 50KB)`
  );
  assert.ok(stats.size > 1000, 'O arquivo PDF deve conter dados válidos');
});
