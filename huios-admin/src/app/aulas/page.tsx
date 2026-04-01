import prisma from '@/lib/prisma';
import CalendarContainer from './CalendarContainer';

export default async function AulasPage() {
  const aulas = await prisma.lesson.findMany({
    include: {
      discipline: {
        include: {
          courseClass: true
        }
      },
      _count: {
        select: {
          attendances: true
        }
      }
    },
    orderBy: { date: 'asc' }
  });

  // Convert to plain objects for client component
  const initialLessons = aulas.map(aula => ({
    id: aula.id,
    date: aula.date,
    startTime: aula.startTime,
    endTime: aula.endTime,
    locationName: aula.locationName,
    description: aula.description,
    discipline: {
      name: aula.discipline.name,
      courseClass: {
        name: aula.discipline.courseClass.name
      }
    }
  }));

  return (
    <div className="max-w-[1600px] mx-auto p-4 lg:p-8">
      <CalendarContainer initialLessons={initialLessons} />
    </div>
  );
}
