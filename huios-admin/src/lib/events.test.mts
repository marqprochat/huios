import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applicablePrice,
  isSlotOccupied,
  countOccupiedSlots,
  isTicketAvailable,
  isRegistrationOpen,
  computeReservedUntil,
  validateCustomFieldAnswers,
  selectExpiredRegistrationIds,
  resolveTicketRemoval,
  type TicketLike,
  type EventLike,
  type CustomFieldDef,
} from './events.ts';

const baseTicket: TicketLike = {
  id: 't1',
  priceStudent: 50,
  priceGeneral: 100,
  quantity: null,
  salesStart: null,
  salesEnd: null,
  audience: 'ALL',
  isActive: true,
};

test('applicablePrice usa o preço de aluno quando isStudent é true', () => {
  assert.equal(applicablePrice(baseTicket, true), 50);
  assert.equal(applicablePrice(baseTicket, false), 100);
});

test('isSlotOccupied: confirmada sempre ocupa', () => {
  assert.equal(isSlotOccupied({ status: 'CONFIRMADA', reservedUntil: null }, new Date()), true);
});

test('isSlotOccupied: pendente ocupa só enquanto a reserva não expirou', () => {
  const now = new Date('2026-01-10T12:00:00Z');
  assert.equal(isSlotOccupied({ status: 'PENDENTE', reservedUntil: new Date('2026-01-10T13:00:00Z') }, now), true);
  assert.equal(isSlotOccupied({ status: 'PENDENTE', reservedUntil: new Date('2026-01-10T11:00:00Z') }, now), false);
});

test('isSlotOccupied: cancelada e expirada nunca ocupam', () => {
  const now = new Date();
  assert.equal(isSlotOccupied({ status: 'CANCELADA', reservedUntil: null }, now), false);
  assert.equal(isSlotOccupied({ status: 'EXPIRADA', reservedUntil: null }, now), false);
});

test('countOccupiedSlots soma apenas os registros ocupando vaga', () => {
  const now = new Date('2026-01-10T12:00:00Z');
  const regs = [
    { status: 'CONFIRMADA' as const, reservedUntil: null },
    { status: 'PENDENTE' as const, reservedUntil: new Date('2026-01-10T13:00:00Z') },
    { status: 'EXPIRADA' as const, reservedUntil: null },
    { status: 'CANCELADA' as const, reservedUntil: null },
  ];
  assert.equal(countOccupiedSlots(regs, now), 2);
});

test('isTicketAvailable respeita isActive, janela de vendas e vagas', () => {
  const now = new Date('2026-01-10T12:00:00Z');
  assert.equal(isTicketAvailable({ ...baseTicket, isActive: false }, { now, isStudent: false, occupied: 0 }), false);
  assert.equal(isTicketAvailable({ ...baseTicket, salesStart: new Date('2026-02-01T00:00:00Z') }, { now, isStudent: false, occupied: 0 }), false);
  assert.equal(isTicketAvailable({ ...baseTicket, salesEnd: new Date('2026-01-01T00:00:00Z') }, { now, isStudent: false, occupied: 0 }), false);
  assert.equal(isTicketAvailable({ ...baseTicket, quantity: 5 }, { now, isStudent: false, occupied: 5 }), false);
  assert.equal(isTicketAvailable({ ...baseTicket, quantity: 5 }, { now, isStudent: false, occupied: 4 }), true);
});

test('isTicketAvailable respeita o público-alvo do lote', () => {
  const now = new Date('2026-01-10T12:00:00Z');
  assert.equal(isTicketAvailable({ ...baseTicket, audience: 'STUDENT' }, { now, isStudent: false, occupied: 0 }), false);
  assert.equal(isTicketAvailable({ ...baseTicket, audience: 'STUDENT' }, { now, isStudent: true, occupied: 0 }), true);
  assert.equal(isTicketAvailable({ ...baseTicket, audience: 'EXTERNAL' }, { now, isStudent: true, occupied: 0 }), false);
  assert.equal(isTicketAvailable({ ...baseTicket, audience: 'EXTERNAL' }, { now, isStudent: false, occupied: 0 }), true);
});

const baseEvent: EventLike = {
  isPublished: true,
  registrationEnabled: true,
  registrationOpensAt: null,
  registrationClosesAt: null,
  capacity: null,
};

test('isRegistrationOpen exige publicado, habilitado e ao menos um lote disponível', () => {
  const now = new Date('2026-01-10T12:00:00Z');
  assert.equal(isRegistrationOpen({ ...baseEvent, isPublished: false }, { now, totalOccupied: 0, hasAvailableTicket: true }), false);
  assert.equal(isRegistrationOpen({ ...baseEvent, registrationEnabled: false }, { now, totalOccupied: 0, hasAvailableTicket: true }), false);
  assert.equal(isRegistrationOpen(baseEvent, { now, totalOccupied: 0, hasAvailableTicket: false }), false);
  assert.equal(isRegistrationOpen(baseEvent, { now, totalOccupied: 0, hasAvailableTicket: true }), true);
});

test('isRegistrationOpen respeita janela de datas e capacidade total', () => {
  const now = new Date('2026-01-10T12:00:00Z');
  assert.equal(isRegistrationOpen({ ...baseEvent, registrationOpensAt: new Date('2026-02-01T00:00:00Z') }, { now, totalOccupied: 0, hasAvailableTicket: true }), false);
  assert.equal(isRegistrationOpen({ ...baseEvent, registrationClosesAt: new Date('2026-01-01T00:00:00Z') }, { now, totalOccupied: 0, hasAvailableTicket: true }), false);
  assert.equal(isRegistrationOpen({ ...baseEvent, capacity: 10 }, { now, totalOccupied: 10, hasAvailableTicket: true }), false);
  assert.equal(isRegistrationOpen({ ...baseEvent, capacity: 10 }, { now, totalOccupied: 9, hasAvailableTicket: true }), true);
});

test('computeReservedUntil soma as horas de reserva à data base', () => {
  const now = new Date('2026-01-10T12:00:00.000Z');
  assert.equal(computeReservedUntil(now, 24).toISOString(), '2026-01-11T12:00:00.000Z');
  assert.equal(computeReservedUntil(now, 2).toISOString(), '2026-01-10T14:00:00.000Z');
});

const textField: CustomFieldDef = { id: 'f1', label: 'Tamanho da camiseta', type: 'TEXT', options: [], required: true };
const selectField: CustomFieldDef = { id: 'f2', label: 'Restrição alimentar', type: 'SELECT', options: ['Nenhuma', 'Vegetariano'], required: false };
const checkboxField: CustomFieldDef = { id: 'f3', label: 'Aceito os termos', type: 'CHECKBOX', options: [], required: true };

test('validateCustomFieldAnswers exige campos obrigatórios preenchidos', () => {
  assert.equal(validateCustomFieldAnswers([textField], {}), 'Preencha "Tamanho da camiseta".');
  assert.equal(validateCustomFieldAnswers([textField], { f1: '  ' }), 'Preencha "Tamanho da camiseta".');
  assert.equal(validateCustomFieldAnswers([textField], { f1: 'M' }), null);
});

test('validateCustomFieldAnswers valida a opção do campo SELECT', () => {
  assert.equal(validateCustomFieldAnswers([selectField], { f2: 'Vegano' }), 'Opção inválida para "Restrição alimentar".');
  assert.equal(validateCustomFieldAnswers([selectField], { f2: 'Vegetariano' }), null);
  assert.equal(validateCustomFieldAnswers([selectField], {}), null); // não obrigatório
});

test('validateCustomFieldAnswers exige CHECKBOX obrigatório marcado como true', () => {
  assert.equal(validateCustomFieldAnswers([checkboxField], {}), 'Confirme "Aceito os termos".');
  assert.equal(validateCustomFieldAnswers([checkboxField], { f3: false }), 'Confirme "Aceito os termos".');
  assert.equal(validateCustomFieldAnswers([checkboxField], { f3: true }), null);
});

test('selectExpiredRegistrationIds seleciona só pendentes com reserva vencida', () => {
  const now = new Date('2026-01-10T12:00:00Z');
  const regs = [
    { id: 'r1', status: 'PENDENTE' as const, reservedUntil: new Date('2026-01-10T11:00:00Z') }, // vencida
    { id: 'r2', status: 'PENDENTE' as const, reservedUntil: new Date('2026-01-10T13:00:00Z') }, // ainda válida
    { id: 'r3', status: 'CONFIRMADA' as const, reservedUntil: null },
    { id: 'r4', status: 'PENDENTE' as const, reservedUntil: null }, // sem prazo — nunca expira
  ];
  assert.deepEqual(selectExpiredRegistrationIds(regs, now), ['r1']);
});

test('resolveTicketRemoval mantém (desativa) lotes com inscrições e remove os sem uso', () => {
  assert.equal(resolveTicketRemoval(true), 'DEACTIVATE');
  assert.equal(resolveTicketRemoval(false), 'DELETE');
});
