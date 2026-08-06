'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions/server';
import { parseBRLocal } from '@/lib/date-utils';
import {
  assertParticipantSelection,
  assertRemovableParticipants,
  parseParticipantIds,
} from '@/lib/exam-participants';
import {
  assertExamCanBePublished,
  buildCreateExamData,
  buildDuplicateExamData,
  type ExamWriteInput,
} from './exam-participant-operations';

function readExamInput(formData: FormData): ExamWriteInput {
  const duration = String(formData.get('duration') ?? '');
  return {
    title: String(formData.get('title') ?? ''),
    description: String(formData.get('description') ?? '') || null,
    disciplineId: String(formData.get('disciplineId') ?? ''),
    startDate: parseBRLocal(String(formData.get('startDate') ?? '')) ?? new Date(),
    endDate: parseBRLocal(String(formData.get('endDate') ?? '')) ?? new Date(),
    duration: duration ? Number.parseInt(duration, 10) : null,
  };
}

type ExamTransaction = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function eligibleStudentIds(
  tx: ExamTransaction,
  disciplineId: string,
  studentIds: string[],
): Promise<string[]> {
  const enrollments = await tx.enrollment.findMany({
    where: {
      studentId: { in: studentIds },
      status: 'CURSANDO',
      class: { disciplines: { some: { id: disciplineId } } },
    },
    select: { studentId: true },
    distinct: ['studentId'],
  });
  return enrollments.map(enrollment => enrollment.studentId);
}

export async function createExam(formData: FormData) {
  await requirePermission('provas.criar');
  const input = readExamInput(formData);
  const studentIds = parseParticipantIds(formData);

  await prisma.$transaction(async tx => {
    assertParticipantSelection(studentIds, await eligibleStudentIds(tx, input.disciplineId, studentIds));
    await tx.exam.create({
      data: buildCreateExamData(input, studentIds),
    });
  });

  revalidatePath('/provas');
  redirect('/provas');
}

export async function updateExam(id: string, formData: FormData) {
  await requirePermission('provas.editar');
  const input = readExamInput(formData);
  const studentIds = parseParticipantIds(formData);

  await prisma.$transaction(async tx => {
    assertParticipantSelection(studentIds, await eligibleStudentIds(tx, input.disciplineId, studentIds));
    const current = await tx.examParticipant.findMany({ where: { examId: id }, select: { studentId: true } });
    const currentIds = current.map(participant => participant.studentId);
    const next = new Set(studentIds);
    const removedIds = currentIds.filter(studentId => !next.has(studentId));
    const submissions = removedIds.length > 0
      ? await tx.examSubmission.findMany({
          where: { examId: id, studentId: { in: removedIds } },
          select: { studentId: true },
        })
      : [];
    assertRemovableParticipants(currentIds, studentIds, submissions.map(submission => submission.studentId));

    await tx.exam.update({ where: { id }, data: input });
    await tx.examParticipant.deleteMany({ where: { examId: id, studentId: { notIn: studentIds } } });
    await tx.examParticipant.createMany({
      data: studentIds.map(studentId => ({ examId: id, studentId })),
      skipDuplicates: true,
    });
  });

  revalidatePath('/provas');
  redirect('/provas');
}

export async function publishExam(id: string): Promise<void> {
  await requirePermission('provas.aplicar');
  await prisma.$transaction(async tx => {
    assertExamCanBePublished(await tx.examParticipant.count({ where: { examId: id } }));
    await tx.exam.update({ where: { id }, data: { isPublished: true } });
  });
  revalidatePath('/provas');
}

export async function unpublishExam(id: string): Promise<void> {
  await requirePermission('provas.aplicar');
  try {
    await prisma.exam.update({
      where: { id },
      data: { isPublished: false }
    });

    revalidatePath('/provas');
  } catch (error) {
    console.error('Error unpublishing exam:', error);
    throw new Error('Failed to unpublish exam');
  }
}

export async function duplicateExam(id: string, newStartDate: string, newEndDate: string, newTitle?: string) {
  await requirePermission('provas.criar');
  try {
    const original = await prisma.exam.findUnique({
      where: { id },
      include: {
        participants: { select: { studentId: true } },
        questions: {
          include: {
            alternatives: true
          }
        }
      }
    });

    if (!original) throw new Error('Exam not found');

    await prisma.exam.create({
      data: buildDuplicateExamData(original, {
        title: newTitle || `${original.title} (Cópia)`,
        startDate: parseBRLocal(newStartDate) ?? new Date(),
        endDate: parseBRLocal(newEndDate) ?? new Date(),
      }),
    });

    revalidatePath('/provas');
    return { success: true };
  } catch (error) {
    console.error('Error duplicating exam:', error);
    throw new Error('Failed to duplicate exam');
  }
}

export async function deleteExam(id: string) {
  await requirePermission('provas.excluir');
  try {
    await prisma.exam.delete({
      where: { id }
    });

    revalidatePath('/provas');
    return { success: true };
  } catch (error) {
    console.error('Error deleting exam:', error);
    throw new Error('Failed to delete exam');
  }
}

export async function createQuestion(examId: string, formData: FormData) {
  await requirePermission('provas.editar');
  try {
    const statement = formData.get('statement') as string;
    const weight = formData.get('weight') as string;
    const alternativesData = formData.get('alternatives') as string;
    const alternatives = JSON.parse(alternativesData) as Array<{ letter: string; text: string; isCorrect: boolean }>;

    const lastQuestion = await prisma.question.findFirst({
      where: { examId },
      orderBy: { order: 'desc' }
    });

    await prisma.question.create({
      data: {
        examId,
        statement,
        weight: parseFloat(weight) || 1,
        order: lastQuestion ? lastQuestion.order + 1 : 0,
        alternatives: {
          create: alternatives
        }
      }
    });

    revalidatePath(`/provas/${examId}/questoes`);
    return { success: true };
  } catch (error) {
    console.error('Error creating question:', error);
    throw new Error('Failed to create question');
  }
}

export async function updateQuestion(id: string, formData: FormData) {
  await requirePermission('provas.editar');
  try {
    const statement = formData.get('statement') as string;
    const weight = formData.get('weight') as string;
    const alternativesData = formData.get('alternatives') as string;
    const alternatives = JSON.parse(alternativesData) as Array<{ letter: string; text: string; isCorrect: boolean }>;

    await prisma.$transaction([
      prisma.question.update({
        where: { id },
        data: {
          statement,
          weight: parseFloat(weight) || 1
        }
      }),
      prisma.alternative.deleteMany({
        where: { questionId: id }
      }),
      prisma.alternative.createMany({
        data: alternatives.map(alt => ({
          questionId: id,
          letter: alt.letter,
          text: alt.text,
          isCorrect: alt.isCorrect
        }))
      })
    ]);

    return { success: true };
  } catch (error) {
    console.error('Error updating question:', error);
    throw new Error('Failed to update question');
  }
}

export async function deleteQuestion(id: string, examId: string) {
  await requirePermission('provas.editar');
  try {
    await prisma.question.delete({
      where: { id }
    });

    revalidatePath(`/provas/${examId}/questoes`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting question:', error);
    throw new Error('Failed to delete question');
  }
}
