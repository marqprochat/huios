import { NextFunction, Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { prisma } from '../services/prisma';
import { getStudentContext } from '../services/studentContext';

type PortalHandler = (req: AuthRequest, res: Response, next: NextFunction) => Promise<unknown>;

async function context(req: AuthRequest) {
  return getStudentContext(req.user.id);
}

export const listStudentLessons: PortalHandler = async (req, res) => {
  const { studentId, disciplineIds } = await context(req);
  const lessons = await prisma.lesson.findMany({
    where: { disciplines: { some: { id: { in: disciplineIds } } } },
    include: {
      disciplines: { include: { courseClasses: { include: { course: true } }, teacher: true } },
      attendances: { where: { studentId } },
      materials: true
    },
    orderBy: { date: 'asc' }
  });

  return res.json(lessons.map(({ disciplines, attendances, ...lesson }) => ({
    ...lesson,
    discipline: disciplines.find(item => disciplineIds.includes(item.id)) ?? disciplines[0],
    attendance: attendances[0]
  })));
};

export const getStudentLesson: PortalHandler = async (req, res) => {
  const { studentId, disciplineIds } = await context(req);
  const lesson = await prisma.lesson.findFirst({
    where: { id: req.params.id, disciplines: { some: { id: { in: disciplineIds } } } },
    include: {
      disciplines: { include: { courseClasses: true } },
      attendances: { where: { studentId } },
      materials: true
    }
  });
  if (!lesson) return res.status(404).json({ message: 'Aula não encontrada' });
  const { disciplines, attendances, ...rest } = lesson;
  return res.json({
    ...rest,
    discipline: disciplines.find(item => disciplineIds.includes(item.id)) ?? disciplines[0],
    attendance: attendances[0]
  });
};

export const getStudentReportCard: PortalHandler = async (req, res) => {
  const { studentId, disciplineIds } = await context(req);
  const grades = await prisma.grade.findMany({
    where: { studentId, disciplineId: { in: disciplineIds } },
    include: { discipline: true, exam: true },
    orderBy: { createdAt: 'desc' }
  });
  return res.json(grades.map(grade => ({
    disciplineId: grade.disciplineId,
    disciplineName: grade.discipline.name,
    value: grade.score,
    examScore: grade.type === 'EXAM' ? grade.score : undefined,
    finalGrade: grade.score,
    id: grade.id,
    title: grade.title,
    type: grade.type,
    weight: grade.weight,
    exam: grade.exam
  })));
};

export const getStudentAttendanceSummary: PortalHandler = async (req, res) => {
  const { studentId, disciplineIds } = await context(req);
  const disciplines = await prisma.discipline.findMany({
    where: { id: { in: disciplineIds } },
    select: {
      id: true,
      name: true,
      lessons: {
        where: { date: { lt: new Date() } },
        select: { attendances: { where: { studentId }, select: { status: true } } }
      }
    }
  });

  return res.json(disciplines.map(discipline => {
    const absences = discipline.lessons.filter(lesson => lesson.attendances[0]?.status === 'ABSENT').length;
    const pendingJustifications = absences >= 2 && absences < 3 ? absences : 0;
    return {
      disciplineId: discipline.id,
      disciplineName: discipline.name,
      totalLessons: discipline.lessons.length,
      absences,
      attendanceRate: discipline.lessons.length
        ? Math.round(((discipline.lessons.length - absences) / discipline.lessons.length) * 10000) / 100
        : 100,
      status: absences >= 3 ? 'AUTO_FAILED' : absences >= 2 ? 'NEEDS_JUSTIFICATION' : 'OK',
      pendingJustifications
    };
  }));
};

export const listStudentExams: PortalHandler = async (req, res) => {
  const { studentId, disciplineIds } = await context(req);
  const exams = await prisma.exam.findMany({
    where: { disciplineId: { in: disciplineIds }, isPublished: true },
    include: { discipline: true, submissions: { where: { studentId } } },
    orderBy: { startDate: 'desc' }
  });
  return res.json(exams.map(({ submissions, endDate, duration, ...exam }) => ({
    ...exam,
    deadline: endDate,
    durationMinutes: duration,
    submission: submissions[0]
  })));
};

export const listStudentExamQuestions: PortalHandler = async (req, res) => {
  const { disciplineIds } = await context(req);
  const exam = await prisma.exam.findFirst({
    where: { id: req.params.id, disciplineId: { in: disciplineIds }, isPublished: true },
    select: {
      questions: {
        orderBy: { order: 'asc' },
        select: { id: true, statement: true, alternatives: { select: { id: true, text: true } } }
      }
    }
  });
  if (!exam) return res.status(404).json({ message: 'Prova não encontrada' });
  return res.json(exam.questions.map(({ statement, ...question }) => ({ ...question, text: statement })));
};

export const submitStudentExam: PortalHandler = async (req, res) => {
  const { studentId, disciplineIds } = await context(req);
  const examId = req.params.id;
  const existing = await prisma.examSubmission.findUnique({ where: { examId_studentId: { examId, studentId } } });
  if (existing?.submittedAt) return res.status(400).json({ message: 'Prova já foi submetida' });

  const exam = await prisma.exam.findFirst({
    where: { id: examId, disciplineId: { in: disciplineIds }, isPublished: true },
    include: { questions: { include: { alternatives: true } } }
  });
  if (!exam) return res.status(404).json({ message: 'Prova não encontrada' });
  const now = new Date();
  if (now < exam.startDate || now > exam.endDate) return res.status(400).json({ message: 'Prova fora do período' });

  const rawAnswers = req.body?.answers;
  const answers: Array<{ questionId: string; alternativeId: string }> = Array.isArray(rawAnswers)
    ? rawAnswers
    : Object.entries(rawAnswers ?? {}).map(([questionId, alternativeId]) => ({ questionId, alternativeId: String(alternativeId) }));
  if (!rawAnswers || typeof rawAnswers !== 'object') return res.status(400).json({ message: 'Respostas inválidas' });

  const submission = existing ?? await prisma.examSubmission.create({ data: { examId, studentId, startedAt: now } });
  let totalScore = 0;
  const maxScore = exam.questions.reduce((sum, question) => sum + question.weight, 0);
  const questionResults = [];
  for (const answer of answers) {
    const question = exam.questions.find(item => item.id === answer.questionId);
    if (!question) continue;
    const selected = question.alternatives.find(item => item.id === answer.alternativeId);
    const correct = question.alternatives.find(item => item.isCorrect);
    const isCorrect = selected?.isCorrect ?? false;
    const points = isCorrect ? question.weight : 0;
    totalScore += points;
    questionResults.push({
      id: question.id, statement: question.statement, isCorrect, weight: question.weight,
      chosenLetter: selected?.letter ?? '—', chosenText: selected?.text ?? '—',
      correctLetter: correct?.letter ?? '—', correctText: correct?.text ?? '—'
    });
    await prisma.studentAnswer.upsert({
      where: { submissionId_questionId: { submissionId: submission.id, questionId: question.id } },
      create: { submissionId: submission.id, questionId: question.id, alternativeId: answer.alternativeId, isCorrect, points },
      update: { alternativeId: answer.alternativeId, isCorrect, points }
    });
  }

  const gradeScore = maxScore ? Math.round((totalScore / maxScore) * 100) / 10 : 0;
  await prisma.examSubmission.update({ where: { id: submission.id }, data: { submittedAt: now, score: totalScore, maxScore } });
  await prisma.grade.create({
    data: { studentId, disciplineId: exam.disciplineId, type: 'EXAM', examId, score: gradeScore, weight: 1, title: exam.title, createdById: req.user.id }
  });
  return res.json({ success: true, score: totalScore, maxScore, gradeScore, questions: questionResults });
};
