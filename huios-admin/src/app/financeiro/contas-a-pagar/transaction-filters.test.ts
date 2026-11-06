import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getEffectiveStatus,
  matchesMonth,
  matchesStatus,
  matchesAmount,
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

test('matchesAmount matches empty filter to all amounts', () => {
  assert.equal(matchesAmount(150, ''), true);
  assert.equal(matchesAmount(150, '   '), true);
});

test('matchesAmount matches exact integer and amounts in the same integer range', () => {
  assert.equal(matchesAmount(150.0, '150'), true);
  assert.equal(matchesAmount(150.5, '150'), true);
  assert.equal(matchesAmount(1500.0, '150'), false);
});

test('matchesAmount matches formatted amounts with commas and dots', () => {
  assert.equal(matchesAmount(1500.0, '1500'), true);
  assert.equal(matchesAmount(1500.0, '1.500'), true);
  assert.equal(matchesAmount(1500.0, '1500,00'), true);
  assert.equal(matchesAmount(1500.0, '1.500,00'), true);
  assert.equal(matchesAmount(1500.0, 'R$ 1.500,00'), true);
  assert.equal(matchesAmount(33.34, '33,34'), true);
  assert.equal(matchesAmount(33.34, '33.34'), true);
  assert.equal(matchesAmount(33.34, '33,3'), true);
});

test('matchesAmount matches range queries', () => {
  assert.equal(matchesAmount(250.0, '100 - 300'), true);
  assert.equal(matchesAmount(100.0, '100 - 300'), true);
  assert.equal(matchesAmount(300.0, '100 - 300'), true);
  assert.equal(matchesAmount(301.0, '100 - 300'), false);
  assert.equal(matchesAmount(250.0, '100 a 300'), true);
});

test('matchesAmount matches comparison operators', () => {
  assert.equal(matchesAmount(500.0, '>= 500'), true);
  assert.equal(matchesAmount(501.0, '>= 500'), true);
  assert.equal(matchesAmount(499.0, '>= 500'), false);
  assert.equal(matchesAmount(50.0, '< 100'), true);
  assert.equal(matchesAmount(150.0, '< 100'), false);
});
