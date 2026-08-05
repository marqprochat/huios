'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions/server';
import { parseBRLocal, parseBRDateAndTime } from '@/lib/date-utils';

export async function createEvent(formData: FormData) {
  await requirePermission('aulas.criar');
  try {
    const title = formData.get('title') as string;
    const type = (formData.get('type') as string) || null;
    const description = (formData.get('description') as string) || null;
    const date = formData.get('date') as string;
    const startTime = formData.get('startTime') as string;
    const endTime = formData.get('endTime') as string;
    const courseClassIds = formData.getAll('courseClassIds') as string[];
    const requiresCheckIn = formData.get('requiresCheckIn') === 'on';
    const locationName = (formData.get('locationName') as string) || null;
    const latitude = formData.get('latitude') as string;
    const longitude = formData.get('longitude') as string;
    const radiusMeters = formData.get('radiusMeters') as string;

    const event = await prisma.event.create({
      data: {
        title,
        type,
        description,
        date: parseBRLocal(date) ?? new Date(),
        startTime: parseBRDateAndTime(date, startTime),
        endTime: parseBRDateAndTime(date, endTime),
        courseClasses: courseClassIds.length > 0 ? { connect: courseClassIds.map(id => ({ id })) } : undefined,
        requiresCheckIn,
        locationName: requiresCheckIn ? locationName : null,
        latitude: requiresCheckIn && latitude ? parseFloat(latitude) : null,
        longitude: requiresCheckIn && longitude ? parseFloat(longitude) : null,
        radiusMeters: requiresCheckIn ? (parseInt(radiusMeters) || 100) : 100
      }
    });

    if (requiresCheckIn) {
      let studentIds: string[];

      if (courseClassIds.length > 0) {
        const enrollments = await prisma.enrollment.findMany({
          where: { classId: { in: courseClassIds }, status: 'CURSANDO' },
          select: { studentId: true }
        });
        studentIds = [...new Set(enrollments.map(e => e.studentId))];
      } else {
        const enrollments = await prisma.enrollment.findMany({
          where: { status: 'CURSANDO' },
          select: { studentId: true },
          distinct: ['studentId']
        });
        studentIds = enrollments.map(e => e.studentId);
      }

      if (studentIds.length > 0) {
        await prisma.eventAttendance.createMany({
          data: studentIds.map(studentId => ({
            eventId: event.id,
            studentId,
            status: 'PENDING'
          })),
          skipDuplicates: true
        });
      }
    }

    revalidatePath('/aulas');
    return event;
  } catch (error) {
    console.error('Error creating event:', error);
    throw new Error('Failed to create event');
  }
}

export async function createEventWithRedirect(formData: FormData) {
  await requirePermission('aulas.criar');
  await createEvent(formData);
  redirect('/aulas');
}

export async function deleteEvent(id: string) {
  await requirePermission('aulas.excluir');
  try {
    await prisma.event.delete({ where: { id } });
    revalidatePath('/aulas');
    return { success: true };
  } catch (error) {
    console.error('Error deleting event:', error);
    throw new Error('Failed to delete event');
  }
}
