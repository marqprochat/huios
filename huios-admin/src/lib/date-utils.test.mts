import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseBRLocal,
  parseBRDateAndTime,
  toBRDateInput,
  toBRTimeInput,
  toBRDateTimeInput,
  formatInstantTimeBR,
  brToday,
  endOfBRDay,
  toCivilDateInput,
  formatDateBR,
} from './date-utils.ts';

// Estes testes DEVEM passar sob qualquer TZ (UTC, America/Sao_Paulo, Asia/Tokyo).
// É exatamente esse o objetivo do módulo: nenhuma dependência do fuso do processo.

test('parseBRLocal interpreta a hora do formulário como horário de Brasília', () => {
  assert.equal(
    parseBRLocal('2026-08-04T19:30')?.toISOString(),
    '2026-08-04T22:30:00.000Z',
  );
});

test('parseBRLocal ancora data sem hora ao meio-dia BRT', () => {
  assert.equal(
    parseBRLocal('2026-08-04')?.toISOString(),
    '2026-08-04T15:00:00.000Z',
  );
});

test('parseBRLocal reproduz exatamente o parseLocalToUTC antigo (sem regressão de escrita)', () => {
  for (const s of ['2026-08-04T19:30', '2026-01-15T07:00', '2026-12-31T23:59']) {
    assert.equal(
      parseBRLocal(s)?.toISOString(),
      new Date(s + ':00.000-03:00').toISOString(),
      `regressão em ${s}`,
    );
  }
});

test('parseBRLocal respeita strings que já trazem fuso', () => {
  assert.equal(
    parseBRLocal('2026-08-04T22:30:00.000Z')?.toISOString(),
    '2026-08-04T22:30:00.000Z',
  );
});

test('round-trip é estável — trava do bug de deriva de +3h por salvamento', () => {
  let d = parseBRLocal('2026-08-04T19:30') as Date;
  for (let i = 0; i < 5; i++) {
    d = parseBRDateAndTime(toBRDateInput(d), toBRTimeInput(d)) as Date;
  }
  assert.equal(d.toISOString(), '2026-08-04T22:30:00.000Z');
  assert.equal(toBRTimeInput(d), '19:30');
});

test('aula às 21:00 BRT não vira o dia no input de data', () => {
  const d = parseBRLocal('2026-08-04T21:00') as Date;
  assert.equal(d.toISOString(), '2026-08-05T00:00:00.000Z');
  assert.equal(toBRDateInput(d), '2026-08-04');
  assert.equal(formatInstantTimeBR(d), '21:00');
});

test('parseBRDateAndTime devolve null quando não há hora', () => {
  assert.equal(parseBRDateAndTime('2026-08-04', ''), null);
  assert.equal(parseBRDateAndTime('', '19:30'), null);
});

test('toBRDateTimeInput serve <input type="datetime-local">', () => {
  assert.equal(
    toBRDateTimeInput(new Date('2026-08-04T22:30:00.000Z')),
    '2026-08-04T19:30',
  );
});

test('endOfBRDay é o limite exclusivo do dia civil BRT', () => {
  assert.equal(endOfBRDay('2026-08-04').toISOString(), '2026-08-05T03:00:00.000Z');
});

test('brToday usa o dia civil BRT, não o UTC', () => {
  // 01:30Z de 5/ago ainda é 4/ago em Brasília
  assert.equal(brToday(new Date('2026-08-05T01:30:00.000Z')), '2026-08-04');
});

test('família de DATA CIVIL preserva o dia (sem regressão de -1 dia)', () => {
  const dueDate = new Date('2026-08-04T00:00:00.000Z');
  assert.equal(toCivilDateInput(dueDate), '2026-08-04');
  assert.equal(formatDateBR(dueDate), '04/08/2026');

  const noonAnchored = new Date('2026-08-04T12:00:00.000Z');
  assert.equal(toCivilDateInput(noonAnchored), '2026-08-04');
});

test('valores nulos/vazios não quebram os formatadores', () => {
  assert.equal(toBRDateInput(null), '');
  assert.equal(toBRTimeInput(undefined), '');
  assert.equal(formatInstantTimeBR(null), '--:--');
  assert.equal(parseBRLocal(''), null);
});

test('DST histórica: horário de verão brasileiro pré-2019 usava -02:00', () => {
  assert.equal(
    parseBRLocal('2018-01-15T19:30')?.toISOString(),
    '2018-01-15T21:30:00.000Z',
  );
});
