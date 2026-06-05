import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get('classId');
  const status = searchParams.get('status');

  const classes = await prisma.courseClass.findMany({
    include: { course: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });

  const enrollmentWhere: any = {};
  if (classId) enrollmentWhere.classId = classId;
  if (status) enrollmentWhere.status = status;

  const enrollments = await prisma.enrollment.findMany({
    where: enrollmentWhere,
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          grades: { select: { score: true, weight: true } },
          attendances: { select: { status: true } },
        },
      },
      class: {
        select: { id: true, name: true, course: { select: { name: true, modality: true } } },
      },
    },
    orderBy: { student: { name: 'asc' } },
  });

  const rows = enrollments.map(e => {
    const grades = e.student.grades;
    const totalWeight = grades.reduce((a, g) => a + g.weight, 0);
    const avgGrade = totalWeight > 0
      ? grades.reduce((a, g) => a + g.score * g.weight, 0) / totalWeight
      : null;

    const atts = e.student.attendances;
    const totalAtts = atts.length;
    const presentAtts = atts.filter(a => a.status === 'PRESENT' || a.status === 'EXCUSED').length;
    const absentCount = atts.filter(a => a.status === 'ABSENT').length;
    const freqPct = totalAtts > 0 ? Math.round((presentAtts / totalAtts) * 100) : null;

    return {
      studentId: e.student.id,
      studentName: e.student.name,
      studentEmail: e.student.email,
      classId: e.class.id,
      className: e.class.name,
      courseName: e.class.course.name,
      modality: e.class.course.modality,
      enrollmentStatus: e.status,
      statusDate: e.statusDate,
      statusReason: e.statusReason,
      avgGrade: avgGrade !== null ? Math.round(avgGrade * 10) / 10 : null,
      freqPct,
      absentCount,
      totalLessons: totalAtts,
    };
  });

  return NextResponse.json({ rows, classes });
}
