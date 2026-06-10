import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const disciplineId = searchParams.get('disciplineId');
  const published = searchParams.get('published'); // 'true' | 'false' | null

  const disciplines = await prisma.discipline.findMany({
    include: { courseClasses: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });

  const where: any = {};
  if (disciplineId) where.disciplineId = disciplineId;
  if (published === 'true') where.isPublished = true;
  if (published === 'false') where.isPublished = false;

  const exams = await prisma.exam.findMany({
    where,
    include: {
      discipline: { select: { id: true, name: true, courseClasses: { select: { name: true } } } },
      _count: { select: { questions: true, submissions: true } },
      submissions: {
        select: {
          score: true,
          maxScore: true,
          submittedAt: true,
          startedAt: true,
          student: { select: { id: true, name: true } },
        },
        orderBy: { student: { name: 'asc' } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const examsWithStats = exams.map(exam => {
    const completed = exam.submissions.filter(s => s.submittedAt !== null && s.score !== null && s.maxScore && s.maxScore > 0);
    const avgGrade = completed.length > 0
      ? completed.reduce((acc, s) => acc + (s.score! / s.maxScore!) * 10, 0) / completed.length
      : null;

    return {
      id: exam.id,
      title: exam.title,
      discipline: exam.discipline,
      startDate: exam.startDate,
      endDate: exam.endDate,
      isPublished: exam.isPublished,
      questionCount: exam._count.questions,
      submissionCount: exam._count.submissions,
      completedCount: completed.length,
      avgGrade: avgGrade !== null ? Math.round(avgGrade * 10) / 10 : null,
      submissions: exam.submissions.map(s => ({
        studentId: s.student.id,
        studentName: s.student.name,
        score: s.score !== null && s.maxScore && s.maxScore > 0
          ? Math.round((s.score / s.maxScore) * 100) / 10
          : null,
        submittedAt: s.submittedAt,
        startedAt: s.startedAt,
      })),
    };
  });

  return NextResponse.json({ exams: examsWithStats, disciplines });
}
