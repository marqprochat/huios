import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getEffectiveStatus,
  matchesMonth,
  matchesStatus,
// Node executes this TypeScript test directly and requires its runtime extension.
// @ts-expect-error TS5097: the project intentionally does not enable TS extension imports.
} from './transaction-filters.ts';

const today = new Date(2026, 6, 30, 12);

test('treats a pending transaction from a past calendar day as overdue', () => {
  assert.equal(getEffectiveStatus({ status: 'PENDENTE', dueDate: '2026-07-29T00:00:00.000Z' }, today), 'VENCIDO');
});

test('does not treat a transaction due today as overdue', () => {
  assert.equal(getEffectiveStatus({ status: 'PENDENTE', dueDate: '2026-07-30T00:00:00.000Z' }, today), 'PENDENTE');
});

test('the overdue filter includes explicit and date-derived overdue transactions', () => {
  assert.equal(matchesStatus({ status: 'VENCIDO', dueDate: '2026-08-10T00:00:00.000Z' }, 'VENCIDO', today), true);
  assert.equal(matchesStatus({ status: 'PENDENTE', dueDate: '2026-07-29T00:00:00.000Z' }, 'VENCIDO', today), true);
  assert.equal(matchesStatus({ status: 'PENDENTE', dueDate: '2026-07-30T00:00:00.000Z' }, 'VENCIDO', today), false);
});

test('the pending filter excludes transactions that are already overdue by date', () => {
  assert.equal(matchesStatus({ status: 'PENDENTE', dueDate: '2026-07-29T00:00:00.000Z' }, 'PENDENTE', today), false);
});

test('the open filter includes pending and overdue transactions', () => {
  assert.equal(matchesStatus({ status: 'PENDENTE', dueDate: '2026-07-30T00:00:00.000Z' }, 'ABERTO', today), true);
  assert.equal(matchesStatus({ status: 'PENDENTE', dueDate: '2026-07-29T00:00:00.000Z' }, 'ABERTO', today), true);
  assert.equal(matchesStatus({ status: 'VENCIDO', dueDate: '2026-08-10T00:00:00.000Z' }, 'ABERTO', today), true);
  assert.equal(matchesStatus({ status: 'PAGO', dueDate: '2026-07-29T00:00:00.000Z' }, 'ABERTO', today), false);
});

test('matches the due month by its literal UTC date without timezone shifting', () => {
  assert.equal(matchesMonth('2026-08-01T00:00:00.000Z', '2026-08'), true);
  assert.equal(matchesMonth('2026-08-01T00:00:00.000Z', '2026-07'), false);
});
