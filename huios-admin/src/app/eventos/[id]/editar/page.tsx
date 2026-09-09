import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { requirePageAccess } from '@/lib/permissions/page-guard';
import { toCivilDateInput, toBRTimeInput, toBRDateTimeInput } from '@/lib/date-utils';
import { updateEvent } from '../../actions';
import EventForm, { EventFormValues } from '../../EventForm';

export const dynamic = 'force-dynamic';

export default async function EditarEventoPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageAccess('eventos.editar');
  const { id } = await params;

  const [evento, courseClasses] = await Promise.all([
    (prisma as any).event.findUnique({
      where: { id },
      include: { courseClasses: { select: { id: true } }, tickets: { orderBy: { order: 'asc' } }, customFields: { orderBy: { order: 'asc' } } },
    }),
    prisma.courseClass.findMany({ select: { id: true, name: true, course: { select: { name: true } } }, orderBy: { name: 'asc' } }),
  ]);
  if (!evento) notFound();

  const initialValues: EventFormValues = {
    id: evento.id,
    title: evento.title,
    type: evento.type ?? '',
    description: evento.description ?? '',
    date: toCivilDateInput(evento.date),
    startTime: toBRTimeInput(evento.startTime),
    endTime: toBRTimeInput(evento.endTime),
    courseClassIds: evento.courseClasses.map((cc: any) => cc.id),
    requiresCheckIn: evento.requiresCheckIn,
    locationName: evento.locationName ?? '',
    latitude: evento.latitude?.toString() ?? '',
    longitude: evento.longitude?.toString() ?? '',
    radiusMeters: evento.radiusMeters?.toString() ?? '100',
    bannerUrl: evento.bannerUrl ?? '',
    locationAddress: evento.locationAddress ?? '',
    mapUrl: evento.mapUrl ?? '',
    meetingPoint: evento.meetingPoint ?? '',
    meetingTime: toBRTimeInput(evento.meetingTime),
    returnTime: toBRTimeInput(evento.returnTime),
    transportInfo: evento.transportInfo ?? '',
    includedItems: evento.includedItems ?? '',
    whatToBring: evento.whatToBring ?? '',
    extraNotes: evento.extraNotes ?? '',
    organizerName: evento.organizerName ?? '',
    organizerPhone: evento.organizerPhone ?? '',
    cancellationPolicy: evento.cancellationPolicy ?? '',
    registrationEnabled: evento.registrationEnabled,
    isPublished: evento.isPublished,
    registrationOpensAt: toBRDateTimeInput(evento.registrationOpensAt),
    registrationClosesAt: toBRDateTimeInput(evento.registrationClosesAt),
    capacity: evento.capacity?.toString() ?? '',
    reservationHours: evento.reservationHours?.toString() ?? '24',
    tickets: evento.tickets.map((t: any) => ({
      id: t.id, name: t.name, description: t.description, priceStudent: t.priceStudent, priceGeneral: t.priceGeneral,
      quantity: t.quantity, salesStart: t.salesStart ? toCivilDateInput(t.salesStart) : null, salesEnd: t.salesEnd ? toCivilDateInput(t.salesEnd) : null,
      audience: t.audience, isActive: t.isActive, order: t.order,
    })),
    customFields: evento.customFields.map((f: any) => ({
      id: f.id, label: f.label, type: f.type, options: f.options, required: f.required, order: f.order,
    })),
  };

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/eventos" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Editar evento</h2>
          <p className="text-slate-500 dark:text-slate-400">{evento.title}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 lg:p-8">
        <EventForm
          mode="edit"
          initialValues={initialValues}
          courseClasses={courseClasses.map((cc) => ({ id: cc.id, name: cc.name, courseName: cc.course.name }))}
          action={updateEvent.bind(null, evento.id)}
        />
      </div>
    </div>
  );
}
