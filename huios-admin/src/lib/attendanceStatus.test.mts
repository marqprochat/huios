import assert from 'node:assert/strict';
import test from 'node:test';

import { getAttendanceApprovalStatus } from './attendanceStatus.ts';

test('keeps attendance-based course waiting while every attendance is pending', () => {
  assert.equal(
    getAttendanceApprovalStatus({
      present: 0,
      absent: 0,
      excused: 0,
      pending: 23,
      total: 23,
    }),
    'Aguardando',
  );
});

test('evaluates attendance-based course after at least one attendance is consolidated', () => {
  assert.equal(
    getAttendanceApprovalStatus({
      present: 1,
      absent: 0,
      excused: 0,
      pending: 22,
      total: 23,
    }),
    'Aprovado',
  );
  assert.equal(
    getAttendanceApprovalStatus({
      present: 0,
      absent: 2,
      excused: 0,
      pending: 21,
      total: 23,
    }),
    'Reprovado',
  );
});
