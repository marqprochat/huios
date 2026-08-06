import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertParticipantSelection,
  assertRemovableParticipants,
  groupDisciplineStudents,
  parseParticipantIds,
} from './exam-participants.ts';

const discipline = {
  id: 'discipline-1',
  name: 'Teologia',
  courseClasses: [
    {
      id: 'class-2',
      name: 'Turma B',
      course: { name: 'Curso Avançado' },
      enrollments: [
        { status: 'CURSANDO', student: { id: 'student-2', name: 'Bruno' } },
        { status: 'TRANCADO', student: { id: 'student-3', name: 'Carla' } },
      ],
    },
    {
      id: 'class-1',
      name: 'Turma A',
      course: { name: 'Curso Básico' },
      enrollments: [
        { status: 'CURSANDO', student: { id: 'student-1', name: 'Ana' } },
        { status: 'CURSANDO', student: { id: 'student-2', name: 'Bruno' } },
      ],
    },
  ],
};

test('agrupa por turma somente alunos cursando e ordena turmas e nomes', () => {
  const groups = groupDisciplineStudents(discipline);

  assert.deepEqual(groups, [
    {
      id: 'class-1', name: 'Turma A', courseName: 'Curso Básico',
      students: [{ id: 'student-1', name: 'Ana' }, { id: 'student-2', name: 'Bruno' }],
    },
    {
      id: 'class-2', name: 'Turma B', courseName: 'Curso Avançado',
      students: [{ id: 'student-2', name: 'Bruno' }],
    },
  ]);
});

test('lê os participantes do formulário sem alterar a ordem', () => {
  const formData = new FormData();
  formData.append('studentIds', 'student-2');
  formData.append('studentIds', 'student-1');
  assert.deepEqual(parseParticipantIds(formData), ['student-2', 'student-1']);
});

test('rejeita seleção vazia, duplicada e aluno fora da disciplina', () => {
  assert.throws(() => assertParticipantSelection([], ['student-1']), /Selecione ao menos um aluno/);
  assert.throws(() => assertParticipantSelection(['student-1', 'student-1'], ['student-1']), /duplicados/);
  assert.throws(() => assertParticipantSelection(['student-2'], ['student-1']), /não está cursando/);
  assert.deepEqual(assertParticipantSelection(['student-2', 'student-1'], ['student-1', 'student-2']), ['student-2', 'student-1']);
});

test('impede remover participante que já iniciou a prova', () => {
  assert.throws(
    () => assertRemovableParticipants(['student-1', 'student-2'], ['student-2'], ['student-1']),
    /já iniciou ou respondeu esta prova/,
  );
  assert.doesNotThrow(() => assertRemovableParticipants(['student-1'], [], []));
});
