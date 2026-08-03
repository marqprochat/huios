import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getAttendanceApprovalStatus,
  getAttendancePercentage,
} from './attendanceStatus';

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

test('keeps waiting with one or two absences and fails automatically on the third', () => {
  const scenarios = [
    { absent: 1, pending: 2, expected: 'Aguardando' },
    { absent: 2, pending: 1, expected: 'Aguardando' },
    { absent: 3, pending: 0, expected: 'Reprovado' },
  ] as const;

  for (const scenario of scenarios) {
    assert.equal(
      getAttendanceApprovalStatus({
        present: 0,
        absent: scenario.absent,
        excused: 0,
        pending: scenario.pending,
        total: 3,
      }),
      scenario.expected,
    );
  }
});

test('approves at 75 percent attendance and calculates percentage from total lessons', () => {
  const attendance = {
    present: 2,
    absent: 1,
    excused: 1,
    pending: 0,
    total: 4,
  };

  assert.equal(getAttendancePercentage(attendance), 75);
  assert.equal(getAttendanceApprovalStatus(attendance), 'Aprovado');
});
