import assert from 'node:assert/strict';
import test from 'node:test';
import { studentExamWhere } from './exam-access.ts';

test('filtro de prova exige publicação e vínculo explícito do aluno', () => {
  assert.deepEqual(studentExamWhere('student-1'), {
    isPublished: true,
    participants: { some: { studentId: 'student-1' } },
  });
});

test('filtro mantém restrições adicionais sem permitir sobrescrever a autorização', () => {
  assert.deepEqual(studentExamWhere('student-1', { id: 'exam-1', isPublished: false }), {
    id: 'exam-1',
    isPublished: true,
    participants: { some: { studentId: 'student-1' } },
  });
});
