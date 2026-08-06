import assert from 'node:assert/strict';
import test from 'node:test';
import { Prisma } from '@prisma/client';

test('Prisma expõe a associação de participantes entre prova e aluno', () => {
  const participant = Prisma.dmmf.datamodel.models.find(model => model.name === 'ExamParticipant');
  assert.ok(participant, 'ExamParticipant deve existir no Prisma Client');

  const exam = Prisma.dmmf.datamodel.models.find(model => model.name === 'Exam');
  const student = Prisma.dmmf.datamodel.models.find(model => model.name === 'Student');

  assert.equal(exam?.fields.find(field => field.name === 'participants')?.type, 'ExamParticipant');
  assert.equal(student?.fields.find(field => field.name === 'examParticipations')?.type, 'ExamParticipant');
});
