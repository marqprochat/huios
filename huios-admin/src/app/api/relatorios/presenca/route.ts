import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get('classId');
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  // Turmas (com curso) para o dropdown de filtro
  const classes = await prisma.courseClass.findMany({
    include: { course: { select: { name: true } } },
    orderBy: [{ course: { name: 'asc' } }, { name: 'asc' }],
  });

  if (!classId) {
    return NextResponse.json({ classes, studentStats: [], lessons: [] });
  }

  // Aulas da turma = aulas cujas disciplinas pertencem a esta turma
  const lessonWhere: any = {
    disciplines: { some: { courseClasses: { some: { id: classId } } } },
  };
  if (start) lessonWhere.date = { ...lessonWhere.date, gte: new Date(start) };
  if (end) lessonWhere.date = { ...lessonWhere.date, lte: new Date(end + 'T23:59:59') };

  const lessons = await prisma.lesson.findMany({
    where: lessonWhere,
    include: {
      disciplines: { select: { name: true } },
      attendances: {
        include: { student: { select: { id: true, name: true } } },
      },
    },
    orderBy: { date: 'desc' },
  });

  // Estatísticas por aluno
  const statsMap: Record<string, { student: { id: string; name: string }; total: number; present: number; absent: number; excused: number }> = {};
  for (const lesson of lessons) {
    for (const att of lesson.attendances) {
      if (!statsMap[att.studentId]) {
        statsMap[att.studentId] = { student: att.student, total: 0, present: 0, absent: 0, excused: 0 };
      }
      statsMap[att.studentId].total++;
      if (att.status === 'PRESENT') statsMap[att.studentId].present++;
      else if (att.status === 'ABSENT') statsMap[att.studentId].absent++;
      else if (att.status === 'EXCUSED') statsMap[att.studentId].excused++;
    }
  }

  const studentStats = Object.values(statsMap)
    .map(s => ({ ...s, percentage: s.total > 0 ? Math.round(((s.present + s.excused) / s.total) * 100) : 0 }))
    .sort((a, b) => a.student.name.localeCompare(b.student.name));

  // Achata o nome da disciplina (1ª) para cada aula, simplificando o cliente
  const lessonsOut = lessons.map(l => ({
    id: l.id,
    date: l.date,
    startTime: l.startTime,
    endTime: l.endTime,
    locationName: l.locationName,
    disciplineName: l.disciplines.map(d => d.name).join(', '),
    attendances: l.attendances.map(a => ({ status: a.status, student: a.student })),
  }));

  return NextResponse.json({ classes, studentStats, lessons: lessonsOut });
}
