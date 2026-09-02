import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions/server';

const RATING_KEYS = ['EXCELENTE', 'BOA', 'REGULAR', 'RUIM'] as const;
type RatingKey = (typeof RATING_KEYS)[number];
type RatingCounts = Record<RatingKey, number>;

// Converte o conceito em nota de 0 a 10 para permitir médias e comparações.
const RATING_SCORE: Record<RatingKey, number> = {
  EXCELENTE: 10,
  BOA: 7.5,
  REGULAR: 5,
  RUIM: 2.5,
};

const emptyCounts = (): RatingCounts => ({ EXCELENTE: 0, BOA: 0, REGULAR: 0, RUIM: 0 });

const isRating = (value: string): value is RatingKey =>
  (RATING_KEYS as readonly string[]).includes(value);

const average = (counts: RatingCounts) => {
  const total = RATING_KEYS.reduce((acc, key) => acc + counts[key], 0);
  if (total === 0) return null;
  const sum = RATING_KEYS.reduce((acc, key) => acc + counts[key] * RATING_SCORE[key], 0);
  return Math.round((sum / total) * 10) / 10;
};

export async function GET() {
  try {
    try {
      await requirePermission('relatorios.visualizar');
    } catch {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const [disciplines, evaluations, submissions] = await Promise.all([
      prisma.discipline.findMany({
        include: {
          teacher: { select: { id: true, name: true, email: true, phone: true, city: true } },
          lessons: { select: { date: true, endTime: true } },
          courseClasses: {
            select: {
              id: true,
              name: true,
              course: { select: { name: true } },
              enrollments: {
                where: { status: { in: ['CURSANDO', 'APROVADO'] } },
                select: { studentId: true },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.teacherEvaluation.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.teacherEvaluationSubmission.findMany({ select: { disciplineId: true, studentId: true } }),
    ]);

    const evaluationsByDiscipline = new Map<string, typeof evaluations>();
    for (const evaluation of evaluations) {
      const list = evaluationsByDiscipline.get(evaluation.disciplineId);
      if (list) list.push(evaluation);
      else evaluationsByDiscipline.set(evaluation.disciplineId, [evaluation]);
    }

    const submissionsByDiscipline = new Map<string, Set<string>>();
    for (const submission of submissions) {
      const set = submissionsByDiscipline.get(submission.disciplineId) ?? new Set<string>();
      set.add(submission.studentId);
      submissionsByDiscipline.set(submission.disciplineId, set);
    }

    const now = new Date();

    const rows = disciplines.map(discipline => {
      const list = evaluationsByDiscipline.get(discipline.id) ?? [];

      const clarity = emptyCounts();
      const engagement = emptyCounts();
      const mastery = emptyCounts();
      const comments: { text: string; date: Date }[] = [];

      for (const evaluation of list) {
        if (isRating(evaluation.clarity)) clarity[evaluation.clarity] += 1;
        if (isRating(evaluation.engagement)) engagement[evaluation.engagement] += 1;
        if (isRating(evaluation.mastery)) mastery[evaluation.mastery] += 1;
        if (evaluation.observations?.trim()) {
          comments.push({ text: evaluation.observations.trim(), date: evaluation.createdAt });
        }
      }

      const eligibleStudents = new Set<string>();
      for (const courseClass of discipline.courseClasses) {
        for (const enrollment of courseClass.enrollments) eligibleStudents.add(enrollment.studentId);
      }

      const submitted = submissionsByDiscipline.get(discipline.id) ?? new Set<string>();
      const respondents = [...submitted].filter(studentId => eligibleStudents.has(studentId)).length;

      // Avaliação liberada quando todas as aulas da disciplina já terminaram.
      const released = discipline.lessons.length > 0 && discipline.lessons.every(lesson => {
        const end = lesson.endTime ? new Date(lesson.endTime) : new Date(lesson.date);
        if (!lesson.endTime) end.setHours(23, 59, 59, 999);
        return now > end;
      });

      const scores = {
        clarity: average(clarity),
        engagement: average(engagement),
        mastery: average(mastery),
      };
      const definedScores = Object.values(scores).filter((value): value is number => value !== null);
      const overallScore = definedScores.length
        ? Math.round((definedScores.reduce((acc, value) => acc + value, 0) / definedScores.length) * 10) / 10
        : null;

      const dates = list.map(item => item.createdAt.getTime());

      return {
        disciplineId: discipline.id,
        disciplineName: discipline.name,
        year: discipline.year,
        workload: discipline.workload,
        teacherId: discipline.teacher?.id ?? null,
        teacherName: discipline.teacher?.name ?? 'Não definido',
        teacherEmail: discipline.teacher?.email ?? null,
        teacherPhone: discipline.teacher?.phone ?? null,
        teacherCity: discipline.teacher?.city ?? null,
        classes: discipline.courseClasses.map(courseClass => ({
          id: courseClass.id,
          name: courseClass.name,
          courseName: courseClass.course.name,
        })),
        lessonCount: discipline.lessons.length,
        released,
        count: list.length,
        eligible: eligibleStudents.size,
        respondents,
        participationPct: eligibleStudents.size > 0
          ? Math.round((respondents / eligibleStudents.size) * 100)
          : null,
        clarity,
        engagement,
        mastery,
        scores,
        overallScore,
        firstEvaluationAt: dates.length ? new Date(Math.min(...dates)) : null,
        lastEvaluationAt: dates.length ? new Date(Math.max(...dates)) : null,
        comments,
      };
    });

    const teachers = [...new Map(
      rows
        .filter(row => row.teacherId)
        .map(row => [row.teacherId as string, { id: row.teacherId as string, name: row.teacherName }]),
    ).values()].sort((a, b) => a.name.localeCompare(b.name));

    const years = [...new Set(rows.map(row => row.year).filter((year): year is number => year !== null))]
      .sort((a, b) => b - a);

    return NextResponse.json({ rows, teachers, years });
  } catch (error) {
    console.error('Teacher evaluation report error:', error);
    return NextResponse.json({ error: 'Erro ao carregar o relatório de avaliações' }, { status: 500 });
  }
}
