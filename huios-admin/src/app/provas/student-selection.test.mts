import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearClassStudents,
  countSelectedClasses,
  filterClassGroups,
  selectClassStudents,
  selectionAfterDisciplineChange,
  toggleStudentSelection,
} from './student-selection.ts';

const groups = [
  { id: 'class-1', name: 'Turma A', courseName: 'Básico', students: [{ id: 'a1', name: 'Ana' }, { id: 'a2', name: 'Bruno' }] },
  { id: 'class-2', name: 'Turma B', courseName: 'Avançado', students: [{ id: 'a2', name: 'Bruno' }, { id: 'a3', name: 'Carla' }] },
];

test('marca e desmarca alunos individualmente sem alterar o conjunto original', () => {
  const original = new Set(['a1']);
  assert.deepEqual([...toggleStudentSelection(original, 'a2')], ['a1', 'a2']);
  assert.deepEqual([...toggleStudentSelection(original, 'a1')], []);
  assert.deepEqual([...original], ['a1']);
});

test('marca a turma inteira e preserva participantes de outras turmas', () => {
  assert.deepEqual([...selectClassStudents(new Set(['a3']), ['a1', 'a2'])], ['a3', 'a1', 'a2']);
});

test('desmarca a turma sem remover aluno bloqueado', () => {
  assert.deepEqual(
    [...clearClassStudents(new Set(['a1', 'a2', 'a3']), ['a1', 'a2'], new Set(['a1']))],
    ['a1', 'a3'],
  );
});

test('troca de disciplina limpa toda a seleção', () => {
  assert.deepEqual([...selectionAfterDisciplineChange('discipline-1', 'discipline-2', new Set(['a1']))], []);
  assert.deepEqual([...selectionAfterDisciplineChange('discipline-1', 'discipline-1', new Set(['a1']))], ['a1']);
});

test('conta turmas selecionadas sem duplicar aluno e filtra por nome', () => {
  assert.equal(countSelectedClasses(groups, new Set(['a2'])), 2);
  assert.deepEqual(filterClassGroups(groups, 'carla').map(group => group.id), ['class-2']);
  assert.deepEqual(filterClassGroups(groups, 'turma a').map(group => group.id), ['class-1']);
});
