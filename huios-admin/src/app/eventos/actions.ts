'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions/server';
import { parseBRLocal, parseBRDateAndTime } from '@/lib/date-utils';
import { generateUniqueEventSlug, resolveTicketRemoval } from '@/lib/events';

export interface TicketInput {
  id?: string;
  name: string;
  description: string | null;
  priceStudent: number;
  priceGeneral: number;
  quantity: number | null;
  salesStart: string | null;
  salesEnd: string | null;
  audience: 'ALL' | 'STUDENT' | 'EXTERNAL';
  isActive: boolean;
  order: number;
}

export interface CustomFieldInput {
  id?: string;
  label: string;
  type: 'TEXT' | 'SELECT' | 'CHECKBOX';
  options: string[];
  required: boolean;
  order: number;
}

function parseEventForm(formData: FormData) {
  const date = formData.get('date') as string;
  const title = ((formData.get('title') as string) || '').trim();
  const courseClassIds = formData.getAll('courseClassIds') as string[];
  const requiresCheckIn = formData.get('requiresCheckIn') === 'on';
  const registrationEnabled = formData.get('registrationEnabled') === 'on';
  const isPublished = formData.get('isPublished') === 'on';

  const num = (key: string): number | null => {
    const raw = formData.get(key) as string;
    if (!raw) return null;
    const v = parseFloat(raw);
    return Number.isNaN(v) ? null : v;
  };
  const int = (key: string, fallback: number | null = null): number | null => {
    const raw = formData.get(key) as string;
    if (!raw) return fallback;
    const v = parseInt(raw, 10);
    return Number.isNaN(v) ? fallback : v;
  };
  const str = (key: string): string | null => {
    const raw = ((formData.get(key) as string) || '').trim();
    return raw || null;
  };

  let tickets: TicketInput[] = [];
  let customFields: CustomFieldInput[] = [];
  try {
    tickets = JSON.parse((formData.get('ticketsJson') as string) || '[]');
    customFields = JSON.parse((formData.get('customFieldsJson') as string) || '[]');
  } catch {
    tickets = [];
    customFields = [];
  }

  return {
    title,
    type: str('type'),
    description: str('description'),
    date: parseBRLocal(date) ?? new Date(),
    startTime: parseBRDateAndTime(date, formData.get('startTime') as string),
    endTime: parseBRDateAndTime(date, formData.get('endTime') as string),
    courseClassIds,
    requiresCheckIn,
    locationName: requiresCheckIn ? str('locationName') : null,
    latitude: requiresCheckIn ? num('latitude') : null,
    longitude: requiresCheckIn ? num('longitude') : null,
    radiusMeters: requiresCheckIn ? (int('radiusMeters', 100) ?? 100) : 100,

    bannerUrl: str('bannerUrl'),
    locationAddress: str('locationAddress'),
    mapUrl: str('mapUrl'),
    meetingPoint: str('meetingPoint'),
    meetingTime: parseBRDateAndTime(date, formData.get('meetingTime') as string),
    returnTime: parseBRDateAndTime(date, formData.get('returnTime') as string),
    transportInfo: str('transportInfo'),
    includedItems: str('includedItems'),
    whatToBring: str('whatToBring'),
    extraNotes: str('extraNotes'),
    organizerName: str('organizerName'),
    organizerPhone: str('organizerPhone'),
    cancellationPolicy: str('cancellationPolicy'),

    registrationEnabled,
    isPublished,
    registrationOpensAt: parseBRLocal(formData.get('registrationOpensAt') as string),
    registrationClosesAt: parseBRLocal(formData.get('registrationClosesAt') as string),
    capacity: int('capacity'),
    reservationHours: int('reservationHours', 24) ?? 24,

    tickets,
    customFields,
  };
}

type EventFormData = ReturnType<typeof parseEventForm>;

function validateEventForm(data: EventFormData): string | null {
  if (!data.title) return 'Informe o título do evento.';
  if (data.registrationEnabled && data.tickets.length === 0) {
    return 'Cadastre ao menos um lote para habilitar a inscrição.';
  }
  for (const t of data.tickets) {
    if (!t.name?.trim()) return 'Todo lote precisa de um nome.';
    if (t.priceStudent < 0 || t.priceGeneral < 0) return 'Preços não podem ser negativos.';
  }
  for (const f of data.customFields) {
    if (!f.label?.trim()) return 'Todo campo extra precisa de um rótulo.';
    if (f.type === 'SELECT' && f.options.length === 0) return `O campo "${f.label}" precisa de ao menos uma opção.`;
  }
  return null;
}

function ticketPayload(t: TicketInput, order: number) {
  return {
    name: t.name,
    description: t.description,
    priceStudent: t.priceStudent,
    priceGeneral: t.priceGeneral,
    quantity: t.quantity,
    salesStart: t.salesStart ? new Date(`${t.salesStart}T00:00:00`) : null,
    salesEnd: t.salesEnd ? new Date(`${t.salesEnd}T23:59:59`) : null,
    audience: t.audience,
    isActive: t.isActive,
    order: t.order ?? order,
  };
}

function customFieldPayload(f: CustomFieldInput, order: number) {
  return { label: f.label, type: f.type, options: f.options, required: f.required, order: f.order ?? order };
}

async function generateEventAttendances(eventId: string, courseClassIds: string[]) {
  let studentIds: string[];
  if (courseClassIds.length > 0) {
    const enrollments = await prisma.enrollment.findMany({
      where: { classId: { in: courseClassIds }, status: 'CURSANDO' },
      select: { studentId: true },
    });
    studentIds = [...new Set(enrollments.map((e) => e.studentId))];
  } else {
    const enrollments = await prisma.enrollment.findMany({
      where: { status: 'CURSANDO' },
      select: { studentId: true },
      distinct: ['studentId'],
    });
    studentIds = enrollments.map((e) => e.studentId);
  }
  if (studentIds.length > 0) {
    await prisma.eventAttendance.createMany({
      data: studentIds.map((studentId) => ({ eventId, studentId, status: 'PENDING' })),
      skipDuplicates: true,
    });
  }
}

export async function createEvent(_prevState: { success: boolean; message: string }, formData: FormData) {
  await requirePermission('eventos.criar');
  const data = parseEventForm(formData);
  const error = validateEventForm(data);
  if (error) return { success: false, message: error };

  try {
    const publicSlug = data.registrationEnabled ? await generateUniqueEventSlug(data.title) : null;

    const event = await (prisma as any).event.create({
      data: {
        title: data.title,
        type: data.type,
        description: data.description,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        courseClasses: data.courseClassIds.length > 0 ? { connect: data.courseClassIds.map((id) => ({ id })) } : undefined,
        requiresCheckIn: data.requiresCheckIn,
        locationName: data.locationName,
        latitude: data.latitude,
        longitude: data.longitude,
        radiusMeters: data.radiusMeters,
        bannerUrl: data.bannerUrl,
        locationAddress: data.locationAddress,
        mapUrl: data.mapUrl,
        meetingPoint: data.meetingPoint,
        meetingTime: data.meetingTime,
        returnTime: data.returnTime,
        transportInfo: data.transportInfo,
        includedItems: data.includedItems,
        whatToBring: data.whatToBring,
        extraNotes: data.extraNotes,
        organizerName: data.organizerName,
        organizerPhone: data.organizerPhone,
        cancellationPolicy: data.cancellationPolicy,
        registrationEnabled: data.registrationEnabled,
        isPublished: data.isPublished,
        publicSlug,
        registrationOpensAt: data.registrationOpensAt,
        registrationClosesAt: data.registrationClosesAt,
        capacity: data.capacity,
        reservationHours: data.reservationHours,
        tickets: data.tickets.length > 0
          ? { create: data.tickets.map((t, i) => ticketPayload(t, i)) }
          : undefined,
        customFields: data.customFields.length > 0
          ? { create: data.customFields.map((f, i) => customFieldPayload(f, i)) }
          : undefined,
      },
    });

    if (data.requiresCheckIn) {
      await generateEventAttendances(event.id, data.courseClassIds);
    }

    revalidatePath('/eventos');
    revalidatePath('/aulas');
    redirect(`/eventos/${event.id}/editar`);
  } catch (err: any) {
    console.error('Erro ao criar evento:', err);
    return { success: false, message: 'Erro ao criar o evento.' };
  }
}

async function syncTickets(eventId: string, tickets: TicketInput[]) {
  const existing = await (prisma as any).eventTicket.findMany({
    where: { eventId },
    select: { id: true, _count: { select: { registrations: true } } },
  });
  const submittedIds = new Set(tickets.filter((t) => t.id).map((t) => t.id));

  for (const row of existing) {
    if (submittedIds.has(row.id)) continue;
    const action = resolveTicketRemoval(row._count.registrations > 0);
    if (action === 'DELETE') {
      await (prisma as any).eventTicket.delete({ where: { id: row.id } });
    } else {
      await (prisma as any).eventTicket.update({ where: { id: row.id }, data: { isActive: false } });
    }
  }

  for (let i = 0; i < tickets.length; i++) {
    const t = tickets[i];
    const payload = ticketPayload(t, i);
    if (t.id) {
      await (prisma as any).eventTicket.update({ where: { id: t.id }, data: payload });
    } else {
      await (prisma as any).eventTicket.create({ data: { ...payload, eventId } });
    }
  }
}

async function syncCustomFields(eventId: string, fields: CustomFieldInput[]) {
  const existing = await (prisma as any).eventCustomField.findMany({ where: { eventId }, select: { id: true } });
  const submittedIds = new Set(fields.filter((f) => f.id).map((f) => f.id));

  for (const row of existing) {
    if (!submittedIds.has(row.id)) {
      await (prisma as any).eventCustomField.delete({ where: { id: row.id } });
    }
  }

  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    const payload = customFieldPayload(f, i);
    if (f.id) {
      await (prisma as any).eventCustomField.update({ where: { id: f.id }, data: payload });
    } else {
      await (prisma as any).eventCustomField.create({ data: { ...payload, eventId } });
    }
  }
}

export async function updateEvent(
  id: string,
  _prevState: { success: boolean; message: string },
  formData: FormData,
) {
  await requirePermission('eventos.editar');
  const data = parseEventForm(formData);
  const error = validateEventForm(data);
  if (error) return { success: false, message: error };

  try {
    const current = await (prisma as any).event.findUnique({ where: { id }, select: { publicSlug: true } });
    if (!current) return { success: false, message: 'Evento não encontrado.' };

    let publicSlug = current.publicSlug;
    if (data.registrationEnabled && !publicSlug) {
      publicSlug = await generateUniqueEventSlug(data.title);
    }

    await (prisma as any).event.update({
      where: { id },
      data: {
        title: data.title,
        type: data.type,
        description: data.description,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        courseClasses: { set: data.courseClassIds.map((cid) => ({ id: cid })) },
        requiresCheckIn: data.requiresCheckIn,
        locationName: data.locationName,
        latitude: data.latitude,
        longitude: data.longitude,
        radiusMeters: data.radiusMeters,
        bannerUrl: data.bannerUrl,
        locationAddress: data.locationAddress,
        mapUrl: data.mapUrl,
        meetingPoint: data.meetingPoint,
        meetingTime: data.meetingTime,
        returnTime: data.returnTime,
        transportInfo: data.transportInfo,
        includedItems: data.includedItems,
        whatToBring: data.whatToBring,
        extraNotes: data.extraNotes,
        organizerName: data.organizerName,
        organizerPhone: data.organizerPhone,
        cancellationPolicy: data.cancellationPolicy,
        registrationEnabled: data.registrationEnabled,
        isPublished: data.isPublished,
        publicSlug,
        registrationOpensAt: data.registrationOpensAt,
        registrationClosesAt: data.registrationClosesAt,
        capacity: data.capacity,
        reservationHours: data.reservationHours,
      },
    });

    await syncTickets(id, data.tickets);
    await syncCustomFields(id, data.customFields);

    revalidatePath('/eventos');
    revalidatePath(`/eventos/${id}/editar`);
    revalidatePath('/aulas');
    return { success: true, message: 'Evento atualizado com sucesso!' };
  } catch (err: any) {
    console.error('Erro ao atualizar evento:', err);
    return { success: false, message: 'Erro ao atualizar o evento.' };
  }
}

export async function deleteEvent(id: string) {
  await requirePermission('eventos.excluir');
  await (prisma as any).event.delete({ where: { id } });
  revalidatePath('/eventos');
  revalidatePath('/aulas');
}

export async function confirmRegistration(registrationId: string) {
  await requirePermission('eventos.editar');
  const registration = await (prisma as any).eventRegistration.findUnique({ where: { id: registrationId } });
  if (!registration) throw new Error('Inscrição não encontrada.');

  await (prisma as any).eventRegistration.update({
    where: { id: registrationId },
    data: { status: 'CONFIRMADA', confirmedAt: new Date(), reservedUntil: null },
  });

  if (registration.transactionId) {
    await (prisma as any).financialTransaction.update({
      where: { id: registration.transactionId },
      data: { status: 'PAGO', paidAt: new Date(), paymentMethod: 'DINHEIRO' },
    });
  }

  revalidatePath(`/eventos/${registration.eventId}/inscritos`);
}

export async function cancelRegistration(registrationId: string) {
  await requirePermission('eventos.editar');
  const registration = await (prisma as any).eventRegistration.findUnique({ where: { id: registrationId } });
  if (!registration) throw new Error('Inscrição não encontrada.');

  await (prisma as any).eventRegistration.update({
    where: { id: registrationId },
    data: { status: 'CANCELADA', canceledAt: new Date() },
  });

  if (registration.transactionId) {
    await (prisma as any).financialTransaction.updateMany({
      where: { id: registration.transactionId, status: 'PENDENTE' },
      data: { status: 'CANCELADA' },
    });
  }

  revalidatePath(`/eventos/${registration.eventId}/inscritos`);
}
