'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';

export async function createLesson(formData: FormData) {
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

    const parseLocalToUTC = (localStr: string) => {
      if (!localStr) return new Date();
      if (localStr.includes('Z') || localStr.includes('+') || (localStr.includes('-') && localStr.length > 10 && localStr.lastIndexOf('-') > 10)) {
        return new Date(localStr);
      }
      return new Date(localStr + (localStr.includes('T') ? ':00.000-03:00' : 'T12:00:00.000-03:00'));
    };

    // Create lesson
    const lesson = await prisma.lesson.create({
      data: {
        disciplines: {
          connect: disciplineIds.map(id => ({ id }))
        },
        date: parseLocalToUTC(date),
        startTime: startTime ? parseLocalToUTC(`${date}T${startTime}`) : null,
        endTime: endTime ? parseLocalToUTC(`${date}T${endTime}`) : null,
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
  } catch (error) {
    console.error('Error creating lesson:', error);
    throw new Error('Failed to create lesson');
  }
  
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

    const parseLocalToUTC = (localStr: string) => {
      if (!localStr) return new Date();
      if (localStr.includes('Z') || localStr.includes('+') || (localStr.includes('-') && localStr.length > 10 && localStr.lastIndexOf('-') > 10)) {
        return new Date(localStr);
      }
      return new Date(localStr + (localStr.includes('T') ? ':00.000-03:00' : 'T12:00:00.000-03:00'));
    };

    // Use a transaction to ensure all or nothing
    await prisma.$transaction(async (tx) => {
      for (const dateStr of dates) {
        const lesson = await tx.lesson.create({
          data: {
            disciplines: {
              connect: disciplineIds.map(id => ({ id }))
            },
            date: parseLocalToUTC(dateStr),
            startTime: startTime ? parseLocalToUTC(`${dateStr}T${startTime}`) : null,
            endTime: endTime ? parseLocalToUTC(`${dateStr}T${endTime}`) : null,
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
            status: 'ACTIVE'
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

    const parseLocalToUTC = (localStr: string) => {
      if (!localStr) return new Date();
      if (localStr.includes('Z') || localStr.includes('+') || (localStr.includes('-') && localStr.length > 10 && localStr.lastIndexOf('-') > 10)) {
        return new Date(localStr);
      }
      return new Date(localStr + (localStr.includes('T') ? ':00.000-03:00' : 'T12:00:00.000-03:00'));
    };

    await prisma.lesson.update({
      where: { id },
      data: {
        disciplines: {
          set: disciplineIds.map(id => ({ id }))
        },
        date: parseLocalToUTC(date),
        startTime: startTime ? parseLocalToUTC(`${date}T${startTime}`) : null,
        endTime: endTime ? parseLocalToUTC(`${date}T${endTime}`) : null,
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

export async function deleteLessonMaterial(id: string) {
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
