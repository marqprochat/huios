'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions/server';
import { parseBRLocal, parseBRDateAndTime } from '@/lib/date-utils';

export async function createLesson(formData: FormData) {
  await requirePermission('aulas.criar');
  try {
    const disciplineIds = formData.getAll('disciplineIds') as string[];
    const date = formData.get('date') as string;
    const startTime = formData.get('startTime') as string;
    const endTime = formData.get('endTime') as string;
    const locationName = formData.get('locationName') as string;
    const latitude = formData.get('latitude') as string;
    const longitude = formData.get('longitude') as string;
    const radiusMeters = formData.get('radiusMeters') as string;
    const description = formData.get('description') as string;

    // Create lesson
    const lesson = await prisma.lesson.create({
      data: {
        disciplines: {
          connect: disciplineIds.map(id => ({ id }))
        },
        date: parseBRLocal(date) ?? new Date(),
        startTime: parseBRDateAndTime(date, startTime),
        endTime: parseBRDateAndTime(date, endTime),
        locationName,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        radiusMeters: parseInt(radiusMeters) || 100,
        description
      }
    });

    // Create attendance records for all enrolled students in all selected disciplines/classes
    const enrollments = await prisma.enrollment.findMany({
      where: {
        class: {
          disciplines: {
            some: { id: { in: disciplineIds } }
          }
        },
        status: 'CURSANDO'
      },
      select: { studentId: true }
    });

    if (enrollments.length > 0) {
      await prisma.attendance.createMany({
        data: enrollments.map(enrollment => ({
          lessonId: lesson.id,
          studentId: enrollment.studentId,
          status: 'PENDING'
        })),
        skipDuplicates: true
      });
    }

    revalidatePath('/aulas');
    return lesson;
  } catch (error) {
    console.error('Error creating lesson:', error);
    throw new Error('Failed to create lesson');
  }
}

export async function createLessonWithRedirect(formData: FormData) {
  await requirePermission('aulas.criar');
  await createLesson(formData);
  redirect('/aulas');
}

export async function createBulkLessons(data: {
  disciplineIds: string[];
  dates: string[];
  startTime: string;
  endTime: string;
  locationName: string;
  latitude?: number;
  longitude?: number;
  radiusMeters: number;
  description?: string;
}) {
  await requirePermission('aulas.criar');
  try {
    const { 
      disciplineIds, 
      dates, 
      startTime, 
      endTime, 
      locationName, 
      latitude, 
      longitude, 
      radiusMeters, 
      description 
    } = data;

    // Use a transaction to ensure all or nothing
    await prisma.$transaction(async (tx) => {
      for (const dateStr of dates) {
        const lesson = await tx.lesson.create({
          data: {
            disciplines: {
              connect: disciplineIds.map(id => ({ id }))
            },
            date: parseBRLocal(dateStr) ?? new Date(),
            startTime: parseBRDateAndTime(dateStr, startTime),
            endTime: parseBRDateAndTime(dateStr, endTime),
            locationName,
            latitude,
            longitude,
            radiusMeters: radiusMeters || 100,
            description
          }
        });

        // Create attendance records
        const enrollments = await tx.enrollment.findMany({
          where: {
            class: {
              disciplines: {
                some: { id: { in: disciplineIds } }
              }
            },
            status: 'CURSANDO'
          },
          select: { studentId: true }
        });

        if (enrollments.length > 0) {
          await tx.attendance.createMany({
            data: enrollments.map(enrollment => ({
              lessonId: lesson.id,
              studentId: enrollment.studentId,
              status: 'PENDING'
            })),
            skipDuplicates: true
          });
        }
      }
    });

    revalidatePath('/aulas');
    return { success: true, count: dates.length };
  } catch (error) {
    console.error('Error creating bulk lessons:', error);
    throw new Error('Failed to create bulk lessons');
  }
}

export async function updateLesson(id: string, formData: FormData) {
  await requirePermission('aulas.editar');
  try {
    const disciplineIds = formData.getAll('disciplineIds') as string[];
    const date = formData.get('date') as string;
    const startTime = formData.get('startTime') as string;
    const endTime = formData.get('endTime') as string;
    const locationName = formData.get('locationName') as string;
    const latitude = formData.get('latitude') as string;
    const longitude = formData.get('longitude') as string;
    const radiusMeters = formData.get('radiusMeters') as string;
    const description = formData.get('description') as string;

    await prisma.lesson.update({
      where: { id },
      data: {
        disciplines: {
          set: disciplineIds.map(id => ({ id }))
        },
        date: parseBRLocal(date) ?? new Date(),
        startTime: parseBRDateAndTime(date, startTime),
        endTime: parseBRDateAndTime(date, endTime),
        locationName,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        radiusMeters: parseInt(radiusMeters) || 100,
        description
      }
    });

    revalidatePath('/aulas');
  } catch (error) {
    console.error('Error updating lesson:', error);
    throw new Error('Failed to update lesson');
  }
  
  redirect('/aulas');
}

export async function deleteLesson(id: string) {
  await requirePermission('aulas.excluir');
  try {
    await prisma.lesson.delete({
      where: { id }
    });

    revalidatePath('/aulas');
    return { success: true };
  } catch (error) {
    console.error('Error deleting lesson:', error);
    throw new Error('Failed to delete lesson');
  }
}

export async function updateAttendance(id: string, status: string, notes?: string) {
  await requirePermission('presenca.editar');
  try {
    await prisma.attendance.update({
      where: { id },
      data: {
        status: status as any,
        markedAt: new Date(),
        notes: notes || null
      }
    });

    revalidatePath('/aulas');
    return { success: true };
  } catch (error) {
    console.error('Error updating attendance:', error);
    throw new Error('Failed to update attendance');
  }
}

export async function bulkUpdateAttendances(lessonId: string, attendances: { id: string; status: string }[]) {
  await requirePermission('presenca.editar');
  try {
    const updates = attendances.map(async (att) => {
      return prisma.attendance.update({
        where: { id: att.id },
        data: {
          status: att.status as any,
          markedAt: new Date()
        }
      });
    });

    await Promise.all(updates);

    revalidatePath('/aulas');
    return { success: true };
  } catch (error) {
    console.error('Error bulk updating attendances:', error);
    throw new Error('Failed to update attendances');
  }
}

export async function deleteLessonMaterial(id: string) {
  await requirePermission('aulas.editar');
  try {
    const material = await prisma.lessonMaterial.findUnique({
      where: { id }
    });

    if (material) {
      // In a real app, we'd also delete the file from the filesystem.
      // But since we are using the API for that usually, here we just delete the DB record
      // or we'll implement the actual file deletion if we were managing it here.
      // For now, let's just delete the record as the API will handle the file.
      await prisma.lessonMaterial.delete({
        where: { id }
      });
    }

    revalidatePath('/aulas');
    return { success: true };
  } catch (error) {
    console.error('Error deleting material:', error);
    throw new Error('Failed to delete material');
  }
}

export async function getLessonMaterials(lessonId: string) {
  await requirePermission('aulas.visualizar');
  try {
    return await prisma.lessonMaterial.findMany({
      where: { lessonId },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    console.error('Error fetching materials:', error);
    return [];
  }
}

export async function searchAvailableStudentsForLesson(lessonId: string, query: string) {
  await requirePermission('presenca.visualizar');
  try {
    const term = (query || '').trim();
    if (term.length < 2) return [];

    const existingAttendances = await prisma.attendance.findMany({
      where: { lessonId },
      select: { studentId: true }
    });
    const existingStudentIds = existingAttendances.map(a => a.studentId);

    const students = await prisma.student.findMany({
      where: {
        id: { notIn: existingStudentIds },
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
          { cpf: { contains: term } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        enrollments: {
          select: {
            status: true,
            class: {
              select: {
                id: true,
                name: true,
                course: { select: { name: true } }
              }
            }
          }
        }
      },
      take: 15,
      orderBy: { name: 'asc' }
    });

    return students.map(s => ({
      id: s.id,
      name: s.name,
      email: s.email,
      turmas: s.enrollments.map(e => `${e.class.name} (${e.status})`).join(', ') || 'Sem Turma'
    }));
  } catch (error) {
    console.error('Error searching students for lesson:', error);
    return [];
  }
}

export async function addStudentToLesson(lessonId: string, studentId: string, notes?: string) {
  await requirePermission('presenca.editar');
  try {
    const defaultNotes = notes || 'Reposição de disciplina';

    const attendance = await prisma.attendance.upsert({
      where: {
        lessonId_studentId: {
          lessonId,
          studentId
        }
      },
      update: {
        notes: defaultNotes
      },
      create: {
        lessonId,
        studentId,
        status: 'PENDING',
        notes: defaultNotes
      }
    });

    revalidatePath(`/aulas/${lessonId}/presenca`);
    revalidatePath('/aulas');
    return { success: true, attendance };
  } catch (error: any) {
    console.error('Error adding student to lesson:', error);
    throw new Error(error.message || 'Erro ao adicionar aluno na aula');
  }
}

export async function removeStudentFromLesson(lessonId: string, attendanceId: string) {
  await requirePermission('presenca.editar');
  try {
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId }
    });

    if (!attendance || attendance.lessonId !== lessonId) {
      throw new Error('Presença não encontrada');
    }

    await prisma.attendance.delete({
      where: { id: attendanceId }
    });

    revalidatePath(`/aulas/${lessonId}/presenca`);
    revalidatePath('/aulas');
    return { success: true };
  } catch (error: any) {
    console.error('Error removing student from lesson:', error);
    throw new Error(error.message || 'Erro ao remover aluno da aula');
  }
}
