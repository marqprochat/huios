import prisma from '@/lib/prisma';
import CalendarContainer from './CalendarContainer';

export default async function AulasPage() {
  const [aulas, eventos, settings] = await Promise.all([
    prisma.lesson.findMany({
      include: {
        disciplines: { include: { courseClasses: true } },
        _count: { select: { attendances: true } }
      }
    }),
    prisma.event.findMany({
      include: { courseClasses: { select: { name: true } } },
      orderBy: { date: 'asc' }
    }),
    prisma.systemSettings.findFirst()
  ]);

  const initialLessons = aulas.map((aula) => ({
    id: aula.id,
    date: aula.date,
    startTime: aula.startTime,
    endTime: aula.endTime,
    locationName: aula.locationName,
    description: aula.description,
    disciplines: aula.disciplines.map((discipline) => ({
      name: discipline.name,
      courseClasses: discipline.courseClasses.map((courseClass) => ({ name: courseClass.name }))
    }))
  }));

  const initialEvents = eventos.map((evento) => ({
    id: evento.id,
    title: evento.title,
    type: evento.type,
    description: evento.description,
    date: evento.date,
    startTime: evento.startTime,
    endTime: evento.endTime,
    requiresCheckIn: evento.requiresCheckIn,
    locationName: evento.locationName,
    courseClasses: evento.courseClasses
  }));

  return (
    <div className="mx-auto max-w-[1600px] p-4 lg:p-8">
      <CalendarContainer
        initialLessons={initialLessons}
        initialEvents={initialEvents}
        defaultLocationName={settings?.locationName || undefined}
      />
    </div>
  );
}
