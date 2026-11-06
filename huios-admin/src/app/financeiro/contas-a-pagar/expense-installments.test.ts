import assert from 'node:assert/strict';
import test from 'node:test';
import {
  generateExpenseInstallments,
  simulateExpense,
  calculateDueDate,
} from '../expense-generator.ts';
import { toCivilDateInput, parseCivilDate } from '../../../lib/date-utils.ts';

test('generates single expense correctly', () => {
  const rows = generateExpenseInstallments({
    description: 'Material de Limpeza',
    amount: 150.5,
    dueDate: '2026-05-10',
    mode: 'unica',
    status: 'PENDENTE',
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].description, 'Material de Limpeza');
  assert.equal(rows[0].amount, 150.5);
  assert.equal(toCivilDateInput(rows[0].dueDate), '2026-05-10');
  assert.equal(rows[0].status, 'PENDENTE');
  assert.equal(rows[0].reference, null);
});

test('generates installment expense with total division and distributed cents', () => {
  const rows = generateExpenseInstallments({
    description: 'Projetor Sala 1',
    amount: 100.0,
    dueDate: '2026-06-15',
    mode: 'parcelada',
    installments: 3,
    amountMode: 'total',
    status: 'PENDENTE',
  });

  assert.equal(rows.length, 3);
  assert.equal(rows[0].description, 'Projetor Sala 1 (1/3)');
  assert.equal(rows[0].amount, 33.34);
  assert.equal(toCivilDateInput(rows[0].dueDate), '2026-06-15');

  assert.equal(rows[1].description, 'Projetor Sala 1 (2/3)');
  assert.equal(rows[1].amount, 33.33);
  assert.equal(toCivilDateInput(rows[1].dueDate), '2026-07-15');

  assert.equal(rows[2].description, 'Projetor Sala 1 (3/3)');
  assert.equal(rows[2].amount, 33.33);
  assert.equal(toCivilDateInput(rows[2].dueDate), '2026-08-15');

  const totalSum = rows.reduce((s, r) => s + r.amount, 0);
  assert.equal(Math.round(totalSum * 100) / 100, 100.0);
  assert.match(rows[0].reference ?? '', /^PARC-/);
  assert.equal(rows[0].reference, rows[1].reference);
  assert.equal(rows[1].reference, rows[2].reference);
});

test('generates installment expense with per-installment value', () => {
  const rows = generateExpenseInstallments({
    description: 'Curso de Liderança',
    amount: 250.0,
    dueDate: '2026-03-05',
    mode: 'parcelada',
    installments: 4,
    amountMode: 'parcela',
  });

  assert.equal(rows.length, 4);
  for (let i = 0; i < 4; i++) {
    assert.equal(rows[i].amount, 250.0);
    assert.equal(rows[i].description, `Curso de Liderança (${i + 1}/4)`);
  }
  assert.equal(toCivilDateInput(rows[0].dueDate), '2026-03-05');
  assert.equal(toCivilDateInput(rows[3].dueDate), '2026-06-05');
});

test('first installment paid marks only the first as PAGO and rest as PENDENTE', () => {
  const rows = generateExpenseInstallments({
    description: 'Notebook Financeiro',
    amount: 3000.0,
    dueDate: '2026-04-10',
    mode: 'parcelada',
    installments: 3,
    amountMode: 'total',
    firstInstallmentPaid: true,
    paidAt: '2026-04-10',
    paymentMethod: 'PIX',
    paymentFormId: 'form-pix-1',
    accountId: 'acc-bb-1',
  });

  assert.equal(rows.length, 3);
  assert.equal(rows[0].status, 'PAGO');
  assert.equal(rows[0].paymentMethod, 'PIX');
  assert.notEqual(rows[0].paidAt, null);

  assert.equal(rows[1].status, 'PENDENTE');
  assert.equal(rows[1].paidAt, null);
  assert.equal(rows[2].status, 'PENDENTE');
  assert.equal(rows[2].paidAt, null);
});

test('generates recurring expenses with monthly frequency', () => {
  const rows = generateExpenseInstallments({
    description: 'Aluguel do Templo',
    amount: 3500.0,
    dueDate: '2026-01-10',
    mode: 'recorrente',
    installments: 12,
    frequency: 'mensal',
  });

  assert.equal(rows.length, 12);
  assert.equal(rows[0].description, 'Aluguel do Templo (1/12)');
  assert.equal(toCivilDateInput(rows[0].dueDate), '2026-01-10');
  assert.equal(rows[11].description, 'Aluguel do Templo (12/12)');
  assert.equal(toCivilDateInput(rows[11].dueDate), '2026-12-10');
  assert.match(rows[0].reference ?? '', /^REC-/);
});

test('simulateExpense gives accurate totals and previews', () => {
  const sim = simulateExpense({
    amount: 1000,
    dueDate: '2026-05-15',
    mode: 'parcelada',
    installments: 3,
    amountMode: 'total',
  });

  assert.equal(sim.count, 3);
  assert.equal(sim.totalAmount, 1000);
  assert.equal(sim.installmentAmount, 333.33);
  assert.equal(sim.firstInstallmentAmount, 333.34);
  assert.equal(sim.hasCentsAdjustment, true);
  assert.equal(toCivilDateInput(sim.firstDueDate), '2026-05-15');
  assert.equal(toCivilDateInput(sim.lastDueDate), '2026-07-15');
});
