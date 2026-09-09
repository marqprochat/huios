import Link from 'next/link';
import prisma from '@/lib/prisma';
import { requirePageAccess } from '@/lib/permissions/page-guard';
import { createEvent } from '../actions';
import EventForm, { EventFormValues } from '../EventForm';

export const dynamic = 'force-dynamic';

const emptyValues: EventFormValues = {
  title: '', type: '', description: '', date: '', startTime: '', endTime: '',
  courseClassIds: [], requiresCheckIn: false, locationName: '', latitude: '', longitude: '', radiusMeters: '100',
  bannerUrl: '', locationAddress: '', mapUrl: '', meetingPoint: '', meetingTime: '', returnTime: '', transportInfo: '',
  includedItems: '', whatToBring: '', extraNotes: '', organizerName: '', organizerPhone: '', cancellationPolicy: '',
  registrationEnabled: false, isPublished: false, registrationOpensAt: '', registrationClosesAt: '', capacity: '', reservationHours: '24',
  tickets: [], customFields: [],
};

export default async function NovoEventoPage() {
  await requirePageAccess('eventos.criar');

  const courseClasses = await prisma.courseClass.findMany({
    select: { id: true, name: true, course: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/eventos" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Novo evento</h2>
          <p className="text-slate-500 dark:text-slate-400">Excursão, evento extra ou institucional</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 lg:p-8">
        <EventForm
          mode="create"
          initialValues={emptyValues}
          courseClasses={courseClasses.map((cc) => ({ id: cc.id, name: cc.name, courseName: cc.course.name }))}
          action={createEvent}
        />
      </div>
    </div>
  );
}
