'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';

export async function createLesson(formData: FormData) {
  try {
    const disciplineId = formData.get('disciplineId') as string;
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
        disciplineId,
        date: new Date(date),
        startTime: startTime ? new Date(`${date}T${startTime}`) : null,
        endTime: endTime ? new Date(`${date}T${endTime}`) : null,
        locationName,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        radiusMeters: parseInt(radiusMeters) || 100,
        description
      }
    });

    // Create attendance records for all enrolled students
    const enrollments = await prisma.enrollment.findMany({
      where: {
        class: {
          disciplines: {
            some: { id: disciplineId }
          }
        },
        status: 'ACTIVE'
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
    redirect('/aulas');
  } catch (error) {
    console.error('Error creating lesson:', error);
    throw new Error('Failed to create lesson');
  }
}

export async function updateLesson(id: string, formData: FormData) {
  try {
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
        date: new Date(date),
        startTime: startTime ? new Date(`${date}T${startTime}`) : null,
        endTime: endTime ? new Date(`${date}T${endTime}`) : null,
        locationName,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        radiusMeters: parseInt(radiusMeters) || 100,
        description
      }
    });

    revalidatePath('/aulas');
    redirect('/aulas');
  } catch (error) {
    console.error('Error updating lesson:', error);
    throw new Error('Failed to update lesson');
  }
}

export async function deleteLesson(id: string) {
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
