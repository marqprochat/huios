'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getReportCardData(studentId: string) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, email: true }
    });

    if (!student) {
      throw new Error('Student not found');
    }

    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId,
        status: { in: ['ACTIVE', 'COMPLETED', 'Ativa', 'Concluída'] }
      },
      include: {
        class: {
          include: {
            disciplines: {
              include: {
                teacher: {
                  select: { name: true }
                }
              }
            }
          }
        }
      }
    });

    const grades = await prisma.grade.findMany({
      where: { studentId },
      include: {
        exam: { select: { title: true } }
      }
    });

    const reportCard: any[] = [];
    enrollments.forEach(enrollment => {
      if (enrollment.class && enrollment.class.disciplines) {
        enrollment.class.disciplines.forEach(discipline => {
          const disciplineGrades = grades.filter(g => g.disciplineId === discipline.id);
          
          const totalWeight = disciplineGrades.reduce((sum, g) => sum + g.weight, 0);
          const weightedScore = disciplineGrades.reduce((sum, g) => sum + (g.score * g.weight), 0);
          const average = totalWeight > 0 ? weightedScore / totalWeight : 0;

          // Convert Date objects to strings for serialization
          const serializedGrades = disciplineGrades.map(g => ({
            ...g,
            createdAt: g.createdAt.toISOString(),
            updatedAt: g.updatedAt.toISOString(),
          }));

          reportCard.push({
            discipline: {
              id: discipline.id,
              name: discipline.name,
              workload: discipline.workload,
              teacher: discipline.teacher ? { name: discipline.teacher.name } : null
            },
            grades: serializedGrades,
            average: Math.round(average * 100) / 100,
            status: disciplineGrades.length === 0 ? 'Aguardando' : average >= 7 ? 'Aprovado' : 'Reprovado'
          });
        });
      }
    });

    reportCard.sort((a, b) => a.discipline.name.localeCompare(b.discipline.name));

    return { student, disciplines: reportCard };
  } catch (error: any) {
    console.error('Error fetching report card via action:', error);
    throw new Error(error.message || 'Failed to fetch report card');
  }
}

export async function createManualGrade(data: {
  studentId: string;
  disciplineId: string;
  score: number;
  weight: number;
  title?: string;
  description?: string;
  type: string;
}) {
  try {
    const { studentId, disciplineId, score, weight, title, description, type } = data;
    
    // We assume the user is an admin or teacher. In Server Actions, we could check auth.
    // However, the previous frontend code sent user 'system' essentially if no auth header.
    
    await prisma.grade.create({
      data: {
        studentId,
        disciplineId,
        type: type as any,
        score,
        weight,
        title: title || undefined,
        description: description || undefined,
        createdById: 'system' // fallback
      }
    });

    revalidatePath(`/boletins/${studentId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error creating manual grade:', error);
    throw new Error('Failed to create grade');
  }
}

export async function updateManualGrade(data: {
  gradeId: string;
  studentId: string;
  score: number;
  weight: number;
  title?: string;
  description?: string;
}) {
  try {
    const { gradeId, studentId, score, weight, title, description } = data;

    if (score < 0 || score > 10) {
      throw new Error('Score must be between 0 and 10');
    }

    await prisma.grade.update({
      where: { id: gradeId },
      data: {
        score,
        weight,
        title: title || undefined,
        description: description || undefined,
      }
    });

    revalidatePath(`/boletins/${studentId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error updating grade:', error);
    throw new Error(error.message || 'Failed to update grade');
  }
}

export async function deleteManualGrade(gradeId: string, studentId: string) {
  try {
    await prisma.grade.delete({
      where: { id: gradeId }
    });

    revalidatePath(`/boletins/${studentId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting grade:', error);
    return { success: false, error: 'Ocorreu um erro ao excluir a nota.' };
  }
}
