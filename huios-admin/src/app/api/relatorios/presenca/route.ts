import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const disciplineId = searchParams.get('disciplineId');
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  // Disciplines + classes for filter dropdowns
  const disciplines = await prisma.discipline.findMany({
    include: { courseClasses: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  });

  if (!disciplineId) {
    return NextResponse.json({ disciplines, studentStats: [], lessons: [] });
  }

  const lessonWhere: any = { disciplines: { some: { id: disciplineId } } };
  if (start) lessonWhere.date = { ...lessonWhere.date, gte: new Date(start) };
  if (end) lessonWhere.date = { ...lessonWhere.date, lte: new Date(end + 'T23:59:59') };

  const lessons = await prisma.lesson.findMany({
    where: lessonWhere,
    include: {
      attendances: {
        include: { student: { select: { id: true, name: true } } },
      },
    },
    orderBy: { date: 'desc' },
  });

  // Build per-student stats
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

  return NextResponse.json({ disciplines, studentStats, lessons });
}
