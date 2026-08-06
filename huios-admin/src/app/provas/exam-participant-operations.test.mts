import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertExamCanBePublished,
  buildCreateExamData,
  buildDuplicateExamData,
} from './exam-participant-operations.ts';

const base = {
  title: 'Prova 1',
  description: 'Descrição',
  disciplineId: 'discipline-1',
  startDate: new Date('2026-08-10T12:00:00Z'),
  endDate: new Date('2026-08-10T13:00:00Z'),
  duration: 60,
};

test('monta criação da prova com participantes explícitos e rascunho', () => {
  assert.deepEqual(buildCreateExamData(base, ['student-1', 'student-2']), {
    ...base,
    isPublished: false,
    participants: { create: [{ studentId: 'student-1' }, { studentId: 'student-2' }] },
  });
});

test('duplicação copia questões, alternativas e participantes em um rascunho', () => {
  const data = buildDuplicateExamData({
    ...base,
    maxAttempts: 1,
    questions: [{
      statement: 'Questão?', type: 'MULTIPLE_CHOICE', order: 0, weight: 2,
      alternatives: [{ letter: 'A', text: 'Resposta', isCorrect: true }],
    }],
    participants: [{ studentId: 'student-1' }, { studentId: 'student-2' }],
  }, {
    title: 'Cópia',
    startDate: new Date('2026-08-11T12:00:00Z'),
    endDate: new Date('2026-08-11T13:00:00Z'),
  });

  assert.equal(data.isPublished, false);
  assert.deepEqual(data.participants.create, [{ studentId: 'student-1' }, { studentId: 'student-2' }]);
  assert.deepEqual(data.questions.create[0].alternatives.create, [{ letter: 'A', text: 'Resposta', isCorrect: true }]);
});

test('publicação exige ao menos um participante', () => {
  assert.throws(() => assertExamCanBePublished(0), /Selecione ao menos um aluno antes de publicar/);
  assert.doesNotThrow(() => assertExamCanBePublished(1));
});
