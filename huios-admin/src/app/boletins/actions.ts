'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';

export async function createGrade(formData: FormData) {
  try {
    const studentId = formData.get('studentId') as string;
    const disciplineId = formData.get('disciplineId') as string;
    const score = formData.get('score') as string;
    const weight = formData.get('weight') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const type = formData.get('type') as string;

    await prisma.grade.create({
      data: {
        studentId,
        disciplineId,
        score: parseFloat(score),
        weight: parseFloat(weight) || 1,
        title,
        description,
        type: type as any,
        createdById: 'system' // TODO: pegar do usuário logado
      }
    });

    revalidatePath(`/boletins/${studentId}`);
    return { success: true };
  } catch (error) {
    console.error('Error creating grade:', error);
    throw new Error('Failed to create grade');
  }
}

export async function updateGrade(id: string, formData: FormData) {
  try {
    const score = formData.get('score') as string;
    const weight = formData.get('weight') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;

    await prisma.grade.update({
      where: { id },
      data: {
        score: parseFloat(score),
        weight: parseFloat(weight) || 1,
        title,
        description
      }
    });

    revalidatePath('/boletins');
    return { success: true };
  } catch (error) {
    console.error('Error updating grade:', error);
    throw new Error('Failed to update grade');
  }
}

export async function deleteGrade(id: string) {
  try {
    await prisma.grade.delete({
      where: { id }
    });

    revalidatePath('/boletins');
    return { success: true };
  } catch (error) {
    console.error('Error deleting grade:', error);
    return { success: false, error: 'Ocorreu um erro ao excluir a nota.' };
  }
}
