import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get('classId');
  const disciplineId = searchParams.get('disciplineId');
  const studentId = searchParams.get('studentId');

  const [classes, disciplines, students] = await Promise.all([
    prisma.courseClass.findMany({ include: { course: { select: { name: true } } }, orderBy: { name: 'asc' } }),
    prisma.discipline.findMany({ orderBy: { name: 'asc' } }),
    prisma.student.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);

  const where: any = {};
  if (disciplineId) where.disciplineId = disciplineId;
  if (studentId) where.studentId = studentId;
  if (classId) {
    where.discipline = { courseClasses: { some: { id: classId } } };
  }

  const grades = await prisma.grade.findMany({
    where,
    include: {
      student: { select: { id: true, name: true } },
      discipline: {
        select: {
          id: true,
          name: true,
          courseClasses: { select: { id: true, name: true, course: { select: { name: true } } } },
        },
      },
      exam: { select: { title: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ grades, classes, disciplines, students });
}
