import { NextFunction, Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { prisma } from '../services/prisma';
import { getStudentContext } from '../services/studentContext';
import fs from 'fs';
import path from 'path';

type PortalHandler = (req: AuthRequest, res: Response, next: NextFunction) => Promise<unknown>;

async function context(req: AuthRequest) {
  return getStudentContext(req.user.id);
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadius = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function coordinates(body: unknown): { latitude: number; longitude: number } | null {
  if (!body || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  const latitude = Number(record.latitude);
  const longitude = Number(record.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
}

async function authorizedLesson(req: AuthRequest) {
  const studentContext = await context(req);
  const lesson = await prisma.lesson.findFirst({
    where: { id: req.params.id, disciplines: { some: { id: { in: studentContext.disciplineIds } } } }
  });
  return { ...studentContext, lesson };
}

async function checkWindow(lesson: { startTime: Date | null; endTime: Date | null }, action: 'checkin' | 'checkout') {
  if (!lesson.startTime || !lesson.endTime) return null;
  let bufferMinutes = 30;
  try {
    const settings = await prisma.systemSettings.findFirst();
    bufferMinutes = settings?.checkInBufferMinutes ?? 30;
  } catch (error) {
    console.error('Could not read check-in configuration, using default buffer:', error);
  }
  const bufferMs = bufferMinutes * 60 * 1000;
  const now = Date.now();
  if (action === 'checkin') {
    if (now < lesson.startTime.getTime() - bufferMs) return 'Check-in ainda não permitido';
    if (now > lesson.startTime.getTime() + bufferMs) return 'Prazo de check-in encerrado';
  } else {
    if (now < lesson.endTime.getTime()) return 'A aula ainda não terminou';
    if (now > lesson.endTime.getTime() + bufferMs) return 'Prazo de check-out encerrado';
  }
  return null;
}

async function attendanceLocation(req: AuthRequest, action: 'checkin' | 'checkout') {
  const location = coordinates(req.body);
  if (!location) return { error: 'Localização não fornecida', status: 400 } as const;
  const { studentId, lesson } = await authorizedLesson(req);
  if (!lesson) return { error: 'Aula não encontrada', status: 404 } as const;
  const windowError = await checkWindow(lesson, action);
  if (windowError) return { error: windowError, status: 400 } as const;
  if (lesson.latitude == null || lesson.longitude == null) {
    return { error: 'Aula não possui localização definida', status: 400 } as const;
  }
  const distance = calculateDistance(lesson.latitude, lesson.longitude, location.latitude, location.longitude);
  if (distance > lesson.radiusMeters) return { error: 'Você está fora do local da aula', status: 400 } as const;
  return { studentId, lesson, location, distance };
}

export const checkInStudentLesson: PortalHandler = async (req, res) => {
  const result = await attendanceLocation(req, 'checkin');
  if ('error' in result) return res.status(result.status ?? 400).json({ error: result.error });
  const { studentId, lesson, location, distance } = result;
  const attendance = await prisma.attendance.upsert({
    where: { lessonId_studentId: { lessonId: lesson.id, studentId } },
    update: {
      status: 'PRESENT', checkInAt: new Date(), checkInLat: location.latitude,
      checkInLong: location.longitude, distance: Math.round(distance)
    },
    create: {
      lessonId: lesson.id, studentId, status: 'PRESENT', checkInAt: new Date(),
      checkInLat: location.latitude, checkInLong: location.longitude, distance: Math.round(distance)
    }
  });
  return res.json({ attendance, distance: Math.round(distance), isWithinRadius: true, message: 'Check-in realizado com sucesso!' });
};

export const checkOutStudentLesson: PortalHandler = async (req, res) => {
  const result = await attendanceLocation(req, 'checkout');
  if ('error' in result) return res.status(result.status ?? 400).json({ error: result.error });
  const { studentId, lesson, location, distance } = result;
  const existing = await prisma.attendance.findUnique({
    where: { lessonId_studentId: { lessonId: lesson.id, studentId } }
  });
  if (!existing?.checkInAt) return res.status(400).json({ error: 'Check-in não realizado nesta aula' });
  const attendance = await prisma.attendance.update({
    where: { lessonId_studentId: { lessonId: lesson.id, studentId } },
    data: {
      checkOutAt: new Date(), checkOutLat: location.latitude, checkOutLong: location.longitude,
      checkOutDistance: Math.round(distance)
    }
  });
  return res.json({ attendance, distance: Math.round(distance), isWithinRadius: true, message: 'Check-out realizado com sucesso!' });
};

function removeUploadedFile(req: AuthRequest) {
  if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
}

const fileContracts: Record<string, { extensions: string[]; signature: (contents: Buffer) => boolean }> = {
  'application/pdf': { extensions: ['.pdf'], signature: contents => contents.subarray(0, 5).equals(Buffer.from('%PDF-')) },
  'image/png': {
    extensions: ['.png'],
    signature: contents => contents.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  },
  'image/jpeg': {
    extensions: ['.jpg', '.jpeg'], signature: contents => contents.length >= 3
      && contents[0] === 0xff && contents[1] === 0xd8 && contents[2] === 0xff
  },
  'application/msword': {
    extensions: ['.doc'],
    signature: contents => contents.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))
  },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    extensions: ['.docx'], signature: contents => contents.length >= 4
      && contents[0] === 0x50 && contents[1] === 0x4b && contents[2] === 0x03 && contents[3] === 0x04
  },
  'text/plain': {
    extensions: ['.txt'], signature: contents => {
      if (contents.includes(0)) return false;
      try {
        new TextDecoder('utf-8', { fatal: true }).decode(contents);
        return true;
      } catch {
        return false;
      }
    }
  }
};

function uploadedFileHasValidContent(file: Express.Multer.File): boolean {
  const contract = fileContracts[file.mimetype];
  if (!contract || !contract.extensions.includes(path.extname(file.originalname).toLowerCase())) return false;
  return contract.signature(fs.readFileSync(file.path));
}

export const submitStudentJustification: PortalHandler = async (req, res) => {
  try {
    const attendanceId = typeof req.body?.attendanceId === 'string' ? req.body.attendanceId : '';
    if (!req.file || !attendanceId) {
      removeUploadedFile(req);
      return res.status(400).json({ error: 'Arquivo e ID da presença são obrigatórios' });
    }
    if (!uploadedFileHasValidContent(req.file)) {
      removeUploadedFile(req);
      return res.status(400).json({ error: 'Conteúdo do arquivo inválido' });
    }
    const { studentId, disciplineIds } = await context(req);
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: { lesson: { include: { disciplines: { select: { id: true, name: true } } } } }
    });
    if (!attendance) {
      removeUploadedFile(req);
      return res.status(404).json({ error: 'Presença não encontrada' });
    }
    if (attendance.studentId !== studentId) {
      removeUploadedFile(req);
      return res.status(403).json({ error: 'Acesso negado' });
    }
    if (attendance.status !== 'ABSENT') {
      removeUploadedFile(req);
      return res.status(400).json({ error: 'Justificativa só pode ser enviada para faltas' });
    }
    const discipline = attendance.lesson.disciplines.find(item => disciplineIds.includes(item.id));
    if (!discipline) {
      removeUploadedFile(req);
      return res.status(403).json({ error: 'Acesso negado' });
    }
    const fileData = {
      studentId, attendanceId, disciplineId: discipline.id, fileName: req.file.originalname,
      filePath: req.file.path, fileSize: req.file.size, mimeType: req.file.mimetype, status: 'PENDING_REVIEW' as const,
      reviewedById: null, reviewedAt: null, reviewNotes: null
    };
    const result = await prisma.$transaction(async tx => {
      const existing = await tx.absenceJustification.findUnique({ where: { attendanceId } });
      const justification = existing
        ? await tx.absenceJustification.update({
          where: { id: existing.id }, data: fileData,
          include: { student: { select: { id: true, name: true } }, discipline: { select: { id: true, name: true } } }
        })
        : await tx.absenceJustification.create({
          data: fileData,
          include: { student: { select: { id: true, name: true } }, discipline: { select: { id: true, name: true } } }
        });
      await tx.notification.create({
        data: {
          type: 'JUSTIFICATION_SUBMITTED', title: 'Justificativa de falta enviada',
          message: `${justification.student.name} enviou um resumo para justificar a falta na disciplina "${justification.discipline.name}". Aguarda aprovação da diretoria.`,
          targetRole: 'COORDENADOR', relatedId: justification.id
        }
      });
      return { justification, previousFilePath: existing?.filePath };
    }, { isolationLevel: 'Serializable' });
    if (result.previousFilePath && result.previousFilePath !== req.file.path && fs.existsSync(result.previousFilePath)) {
      try {
        fs.unlinkSync(result.previousFilePath);
      } catch (error) {
        console.error('Could not remove replaced justification file:', error);
      }
    }
    return res.status(201).json(result.justification);
  } catch (error) {
    removeUploadedFile(req);
    throw error;
  }
};

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
        select: {
          attendances: {
            where: { studentId },
            select: { id: true, status: true, justification: { select: { status: true } } }
          }
        }
      }
    }
  });

  return res.json(disciplines.map(discipline => {
    const absences = discipline.lessons.filter(lesson => lesson.attendances[0]?.status === 'ABSENT').length;
    const pendingJustifications = discipline.lessons.filter(lesson => {
      const attendance = lesson.attendances[0];
      return attendance?.status === 'ABSENT'
        && attendance.justification?.status !== 'APPROVED';
    }).length;
    return {
      disciplineId: discipline.id,
      disciplineName: discipline.name,
      totalLessons: discipline.lessons.length,
      absences,
      attendanceRate: discipline.lessons.length
        ? Math.round(((discipline.lessons.length - absences) / discipline.lessons.length) * 10000) / 100
        : 100,
      status: absences >= 3 ? 'AUTO_FAILED' : absences >= 2 ? 'NEEDS_JUSTIFICATION' : 'OK',
      pendingJustifications,
      attendanceId: discipline.lessons.find(lesson => {
        const attendance = lesson.attendances[0];
        return attendance?.status === 'ABSENT' && (!attendance.justification || attendance.justification.status === 'REJECTED');
      })?.attendances[0]?.id,
      justificationStatus: discipline.lessons.find(lesson => {
        const attendance = lesson.attendances[0];
        return attendance?.status === 'ABSENT' && (!attendance.justification || attendance.justification.status === 'REJECTED');
      })?.attendances[0]?.justification?.status
    };
  }));
};

export const listStudentExams: PortalHandler = async (req, res) => {
  const { studentId, disciplineIds } = await context(req);
  const now = new Date();
  const exams = await prisma.exam.findMany({
    where: { disciplineId: { in: disciplineIds }, isPublished: true },
    include: { discipline: true, submissions: { where: { studentId } } },
    orderBy: { startDate: 'desc' }
  });
  return res.json(exams.map(({ submissions, endDate, duration, ...exam }) => ({
    ...exam,
    deadline: endDate,
    durationMinutes: duration,
    availabilityStatus: now < exam.startDate ? 'NOT_STARTED' : now > endDate ? 'EXPIRED' : 'AVAILABLE',
    submission: submissions[0] ? {
      ...submissions[0],
      gradeScore: submissions[0].score != null && submissions[0].maxScore
        ? Math.round((submissions[0].score / submissions[0].maxScore) * 100) / 10
        : undefined
    } : undefined
  })));
};

export const listStudentExamQuestions: PortalHandler = async (req, res) => {
  const { studentId, disciplineIds } = await context(req);
  const now = new Date();
  const exam = await prisma.exam.findFirst({
    where: { id: req.params.id, disciplineId: { in: disciplineIds }, isPublished: true, startDate: { lte: now }, endDate: { gte: now } },
    select: {
      id: true,
      submissions: { where: { studentId }, select: { id: true, submittedAt: true } },
      questions: {
        orderBy: { order: 'asc' },
        select: { id: true, statement: true, alternatives: { select: { id: true, text: true } } }
      }
    }
  });
  if (!exam) return res.status(404).json({ message: 'Prova não encontrada' });
  if (exam.submissions?.[0]?.submittedAt) return res.status(409).json({ message: 'Prova já foi submetida' });
  await prisma.examSubmission.upsert({
    where: { examId_studentId: { examId: exam.id, studentId } },
    create: { examId: exam.id, studentId, startedAt: now },
    update: {}
  });
  const currentSubmission = await prisma.examSubmission.findUnique({
    where: { examId_studentId: { examId: exam.id, studentId } },
    select: { submittedAt: true }
  });
  if (currentSubmission?.submittedAt) return res.status(409).json({ message: 'Prova já foi submetida' });
  return res.json(exam.questions.map(({ statement, ...question }) => ({ ...question, text: statement })));
};

export const submitStudentExam: PortalHandler = async (req, res) => {
  const { studentId, disciplineIds } = await context(req);
  const examId = req.params.id;
  const exam = await prisma.exam.findFirst({
    where: { id: examId, disciplineId: { in: disciplineIds }, isPublished: true },
    include: { questions: { include: { alternatives: true } } }
  });
  if (!exam) return res.status(404).json({ message: 'Prova não encontrada' });
  const now = new Date();
  if (now < exam.startDate || now > exam.endDate) return res.status(400).json({ message: 'Prova fora do período' });

  const rawAnswers = req.body?.answers;
  if (!rawAnswers || typeof rawAnswers !== 'object') return res.status(400).json({ message: 'Respostas inválidas' });
  const answers: unknown[] = Array.isArray(rawAnswers)
    ? rawAnswers
    : Object.entries(rawAnswers).map(([questionId, alternativeId]) => ({ questionId, alternativeId }));
  const validShape = answers.every(answer => {
    if (!answer || typeof answer !== 'object') return false;
    const item = answer as Record<string, unknown>;
    return typeof item.questionId === 'string' && item.questionId.length > 0
      && typeof item.alternativeId === 'string' && item.alternativeId.length > 0;
  });
  if (!validShape) return res.status(400).json({ message: 'Respostas inválidas' });
  const normalizedAnswers = answers as Array<{ questionId: string; alternativeId: string }>;
  if (new Set(normalizedAnswers.map(answer => answer.questionId)).size !== normalizedAnswers.length) {
    return res.status(400).json({ message: 'Questão respondida mais de uma vez' });
  }
  const answerReferencesAreValid = normalizedAnswers.every(answer => {
    const question = exam.questions.find(item => item.id === answer.questionId);
    return question?.alternatives.some(item => item.id === answer.alternativeId) ?? false;
  });
  if (!answerReferencesAreValid) return res.status(400).json({ message: 'Resposta não pertence à prova' });

  let totalScore = 0;
  const maxScore = exam.questions.reduce((sum, question) => sum + question.weight, 0);
  const questionResults = [];
  for (const answer of normalizedAnswers) {
    const question = exam.questions.find(item => item.id === answer.questionId);
    if (!question) continue; // validated above
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
  }

  const gradeScore = maxScore ? Math.round((totalScore / maxScore) * 100) / 10 : 0;
  const transactionResult = await prisma.$transaction(async tx => {
    const existing = await tx.examSubmission.findUnique({ where: { examId_studentId: { examId, studentId } } });
    if (!existing) return { conflict: 'Prova ainda não iniciada' } as const;
    if (existing.submittedAt) return { conflict: 'Prova já foi submetida' } as const;
    const durationDeadline = exam.duration
      ? new Date(existing.startedAt.getTime() + exam.duration * 60_000)
      : exam.endDate;
    const effectiveDeadline = new Date(Math.min(exam.endDate.getTime(), durationDeadline.getTime()));
    if (now > effectiveDeadline) return { conflict: 'Tempo da prova encerrado' } as const;
    const claimed = await tx.examSubmission.updateMany({
      where: { id: existing.id, submittedAt: null },
      data: { submittedAt: now, score: totalScore, maxScore }
    });
    if (claimed.count !== 1) return { conflict: 'Prova já foi submetida' } as const;
    const submission = existing;

    for (const answer of normalizedAnswers) {
      const question = exam.questions.find(item => item.id === answer.questionId)!;
      const selected = question.alternatives.find(item => item.id === answer.alternativeId)!;
      const isCorrect = selected.isCorrect;
      const points = isCorrect ? question.weight : 0;
      await tx.studentAnswer.upsert({
        where: { submissionId_questionId: { submissionId: submission.id, questionId: question.id } },
        create: { submissionId: submission.id, questionId: question.id, alternativeId: answer.alternativeId, isCorrect, points },
        update: { alternativeId: answer.alternativeId, isCorrect, points }
      });
    }

    const gradeData = {
      studentId, disciplineId: exam.disciplineId, type: 'EXAM' as const, examId,
      score: gradeScore, weight: 1, title: exam.title, createdById: req.user.id
    };
    await tx.grade.upsert({
      where: { studentId_examId: { studentId, examId } },
      create: gradeData,
      update: gradeData
    });
    return { conflict: null } as const;
  });
  if (transactionResult.conflict) return res.status(409).json({ message: transactionResult.conflict });
  return res.json({ success: true, score: totalScore, maxScore, gradeScore, questions: questionResults });
};
