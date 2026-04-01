'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';

export async function createExam(formData: FormData) {
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const disciplineId = formData.get('disciplineId') as string;
  const startDate = formData.get('startDate') as string;
  const endDate = formData.get('endDate') as string;
  const duration = formData.get('duration') as string;

  try {
    await prisma.exam.create({
      data: {
        title,
        description,
        disciplineId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        duration: duration ? parseInt(duration) : null,
        isPublished: false
      }
    });
  } catch (error) {
    console.error('Error creating exam:', error);
    throw new Error('Failed to create exam');
  }

  revalidatePath('/provas');
  redirect('/provas');
}

export async function updateExam(id: string, formData: FormData) {
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const disciplineId = formData.get('disciplineId') as string;
  const startDate = formData.get('startDate') as string;
  const endDate = formData.get('endDate') as string;
  const duration = formData.get('duration') as string;

  try {
    await prisma.exam.update({
      where: { id },
      data: {
        title,
        description,
        disciplineId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        duration: duration ? parseInt(duration) : null
      }
    });
  } catch (error) {
    console.error('Error updating exam:', error);
    throw new Error('Failed to update exam');
  }

  revalidatePath('/provas');
  redirect('/provas');
}

export async function publishExam(id: string) {
  try {
    const exam = await prisma.exam.update({
      where: { id },
      data: { isPublished: true }
    });

    revalidatePath('/provas');
    return { success: true };
  } catch (error) {
    console.error('Error publishing exam:', error);
    throw new Error('Failed to publish exam');
  }
}

export async function unpublishExam(id: string) {
  try {
    await prisma.exam.update({
      where: { id },
      data: { isPublished: false }
    });

    revalidatePath('/provas');
    return { success: true };
  } catch (error) {
    console.error('Error unpublishing exam:', error);
    throw new Error('Failed to unpublish exam');
  }
}

export async function duplicateExam(id: string, newStartDate: string, newEndDate: string, newTitle?: string) {
  try {
    const original = await prisma.exam.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            alternatives: true
          }
        }
      }
    });

    if (!original) throw new Error('Exam not found');

    await prisma.exam.create({
      data: {
        title: newTitle || `${original.title} (Cópia)`,
        description: original.description,
        disciplineId: original.disciplineId,
        startDate: new Date(newStartDate),
        endDate: new Date(newEndDate),
        duration: original.duration,
        maxAttempts: original.maxAttempts,
        isPublished: false,
        questions: {
          create: original.questions.map(q => ({
            statement: q.statement,
            type: q.type,
            order: q.order,
            weight: q.weight,
            alternatives: {
              create: q.alternatives.map(a => ({
                letter: a.letter,
                text: a.text,
                isCorrect: a.isCorrect
              }))
            }
          }))
        }
      }
    });

    revalidatePath('/provas');
    return { success: true };
  } catch (error) {
    console.error('Error duplicating exam:', error);
    throw new Error('Failed to duplicate exam');
  }
}

export async function deleteExam(id: string) {
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
  try {
    const statement = formData.get('statement') as string;
    const weight = formData.get('weight') as string;
    const alternativesData = formData.get('alternatives') as string;
    const alternatives = JSON.parse(alternativesData);

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
  try {
    const statement = formData.get('statement') as string;
    const weight = formData.get('weight') as string;
    const alternativesData = formData.get('alternatives') as string;
    const alternatives = JSON.parse(alternativesData);

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
        data: alternatives.map((alt: any) => ({
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
