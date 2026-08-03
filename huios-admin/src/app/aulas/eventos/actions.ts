'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions/server';

// Aplica o fuso horário do Brasil (America/Sao_Paulo, UTC-3 fixo) a uma string
// de data/hora "solta" vinda do formulário (sem timezone), igual ao padrão
// já usado em src/app/aulas/actions.ts para aulas.
function parseLocalToUTC(localStr: string): Date {
  if (!localStr) return new Date();
  if (localStr.includes('Z') || localStr.includes('+') || (localStr.includes('-') && localStr.length > 10 && localStr.lastIndexOf('-') > 10)) {
    return new Date(localStr);
  }
  return new Date(localStr + (localStr.includes('T') ? ':00.000-03:00' : 'T12:00:00.000-03:00'));
}

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
        date: parseLocalToUTC(date),
        startTime: startTime ? parseLocalToUTC(`${date}T${startTime}`) : null,
        endTime: endTime ? parseLocalToUTC(`${date}T${endTime}`) : null,
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
