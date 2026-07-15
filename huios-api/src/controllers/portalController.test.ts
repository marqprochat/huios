import request from 'supertest';
import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../app';
import { prisma } from '../services/prisma';
import fs from 'fs';
import path from 'path';

const token = jwt.sign(
  { id: 'user-1', email: 'student@example.com', role: 'ALUNO' },
  process.env.JWT_SECRET || 'huios-secret-key-change-in-production'
);

function authenticate() {
  vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
    student: { id: 'student-1', enrollments: [{ classId: 'class-1' }] }
  } as never);
  vi.spyOn(prisma.discipline, 'findMany').mockResolvedValue([{ id: 'discipline-1' }] as never);
}

const uploadsDirectory = path.join(process.cwd(), 'uploads', 'justifications');
const uploadedFiles = () => fs.existsSync(uploadsDirectory) ? fs.readdirSync(uploadsDirectory).sort() : [];
const pdfContents = Buffer.from('%PDF-1.7\nvalid test document');

describe('portal routes', () => {
  beforeEach(authenticate);
  afterEach(() => vi.restoreAllMocks());

  it('protects every portal endpoint with JWT', async () => {
    const calls = [
      request(app).get('/api/portal/aulas'),
      request(app).get('/api/portal/aulas/lesson-1'),
      request(app).get('/api/portal/boletim'),
      request(app).get('/api/portal/presenca/pendencias'),
      request(app).get('/api/portal/provas'),
      request(app).get('/api/portal/provas/exam-1/questoes'),
      request(app).post('/api/portal/provas/exam-1/submit').send({ answers: {} }),
      request(app).post('/api/portal/aulas/lesson-1/checkin').send({ latitude: -23, longitude: -46 }),
      request(app).post('/api/portal/aulas/lesson-1/checkout').send({ latitude: -23, longitude: -46 }),
      request(app).post('/api/portal/presenca/justificativa').field('attendanceId', 'attendance-1')
        .attach('file', Buffer.from('document'), { filename: 'resumo.pdf', contentType: 'application/pdf' })
    ];
    const responses = await Promise.all(calls);
    expect(responses.map(({ status }) => status)).toEqual([401, 401, 401, 401, 401, 401, 401, 401, 401, 401]);
  });

  it('lists only lessons from the authenticated student disciplines', async () => {
    const findMany = vi.spyOn(prisma.lesson, 'findMany').mockResolvedValue([]);
    const response = await request(app).get('/api/portal/aulas').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { disciplines: { some: { id: { in: ['discipline-1'] } } } }
    }));
  });

  it('does not expose a lesson outside the authenticated student scope', async () => {
    const findFirst = vi.spyOn(prisma.lesson, 'findFirst').mockResolvedValue(null);
    const response = await request(app).get('/api/portal/aulas/lesson-2').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(404);
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'lesson-2', disciplines: { some: { id: { in: ['discipline-1'] } } } }
    }));
  });

  it('returns 404 when check-in lesson is outside the student disciplines', async () => {
    const findFirst = vi.spyOn(prisma.lesson, 'findFirst').mockResolvedValue(null);
    const response = await request(app).post('/api/portal/aulas/foreign/checkin')
      .set('Authorization', `Bearer ${token}`).send({ latitude: -23, longitude: -46 });
    expect(response.status).toBe(404);
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'foreign', disciplines: { some: { id: { in: ['discipline-1'] } } } }
    }));
  });

  it('rejects check-in outside the configured radius without recording attendance', async () => {
    vi.spyOn(prisma.lesson, 'findFirst').mockResolvedValue({
      id: 'lesson-1', startTime: null, endTime: null, latitude: -23, longitude: -46, radiusMeters: 50
    } as never);
    const upsert = vi.spyOn(prisma.attendance, 'upsert');
    const response = await request(app).post('/api/portal/aulas/lesson-1/checkin')
      .set('Authorization', `Bearer ${token}`).send({ studentId: 'attacker', latitude: -24, longitude: -46 });
    expect(response.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('rejects check-in outside the lesson time window', async () => {
    vi.spyOn(prisma.lesson, 'findFirst').mockResolvedValue({
      id: 'lesson-1', startTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 3 * 60 * 60 * 1000), latitude: -23, longitude: -46, radiusMeters: 100
    } as never);
    vi.spyOn(prisma.systemSettings, 'findFirst').mockResolvedValue(null);
    const upsert = vi.spyOn(prisma.attendance, 'upsert');
    const response = await request(app).post('/api/portal/aulas/lesson-1/checkin')
      .set('Authorization', `Bearer ${token}`).send({ latitude: -23, longitude: -46 });
    expect(response.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('uses a non-default configured check-in buffer', async () => {
    vi.spyOn(prisma.lesson, 'findFirst').mockResolvedValue({
      id: 'lesson-1', startTime: new Date(Date.now() + 60 * 60 * 1000),
      endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), latitude: -23, longitude: -46, radiusMeters: 100
    } as never);
    vi.spyOn(prisma.systemSettings, 'findFirst').mockResolvedValue({ checkInBufferMinutes: 90 } as never);
    const upsert = vi.spyOn(prisma.attendance, 'upsert').mockResolvedValue({ id: 'attendance-1' } as never);
    const response = await request(app).post('/api/portal/aulas/lesson-1/checkin')
      .set('Authorization', `Bearer ${token}`).send({ latitude: -23, longitude: -46 });
    expect(response.status).toBe(200);
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it('checks in with the JWT-derived student id', async () => {
    vi.spyOn(prisma.lesson, 'findFirst').mockResolvedValue({
      id: 'lesson-1', startTime: null, endTime: null, latitude: -23, longitude: -46, radiusMeters: 100
    } as never);
    const upsert = vi.spyOn(prisma.attendance, 'upsert').mockResolvedValue({ id: 'attendance-1' } as never);
    const response = await request(app).post('/api/portal/aulas/lesson-1/checkin')
      .set('Authorization', `Bearer ${token}`).send({ studentId: 'attacker', latitude: -23, longitude: -46 });
    expect(response.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { lessonId_studentId: { lessonId: 'lesson-1', studentId: 'student-1' } },
      create: expect.objectContaining({ studentId: 'student-1' })
    }));
  });

  it('requires the authenticated student to have checked in before checkout', async () => {
    vi.spyOn(prisma.lesson, 'findFirst').mockResolvedValue({
      id: 'lesson-1', startTime: null, endTime: null, latitude: -23, longitude: -46, radiusMeters: 100
    } as never);
    vi.spyOn(prisma.attendance, 'findUnique').mockResolvedValue(null);
    const update = vi.spyOn(prisma.attendance, 'update');
    const response = await request(app).post('/api/portal/aulas/lesson-1/checkout')
      .set('Authorization', `Bearer ${token}`).send({ latitude: -23, longitude: -46 });
    expect(response.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it('checks out using the JWT-derived attendance key', async () => {
    vi.spyOn(prisma.lesson, 'findFirst').mockResolvedValue({
      id: 'lesson-1', startTime: null, endTime: null, latitude: -23, longitude: -46, radiusMeters: 100
    } as never);
    const findUnique = vi.spyOn(prisma.attendance, 'findUnique').mockResolvedValue({ checkInAt: new Date() } as never);
    const update = vi.spyOn(prisma.attendance, 'update').mockResolvedValue({ id: 'attendance-1' } as never);
    const response = await request(app).post('/api/portal/aulas/lesson-1/checkout')
      .set('Authorization', `Bearer ${token}`).send({ studentId: 'attacker', latitude: -23, longitude: -46 });
    expect(response.status).toBe(200);
    const key = { lessonId_studentId: { lessonId: 'lesson-1', studentId: 'student-1' } };
    expect(findUnique).toHaveBeenCalledWith({ where: key });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: key }));
  });

  it('rejects a justification for another student attendance', async () => {
    vi.spyOn(prisma.attendance, 'findUnique').mockResolvedValue({
      id: 'attendance-2', studentId: 'student-2', status: 'ABSENT', lesson: { disciplines: [{ id: 'discipline-1' }] }
    } as never);
    const create = vi.spyOn(prisma.absenceJustification, 'create');
    const response = await request(app).post('/api/portal/presenca/justificativa')
      .set('Authorization', `Bearer ${token}`).field('attendanceId', 'attendance-2')
      .attach('file', pdfContents, { filename: 'resumo.pdf', contentType: 'application/pdf' });
    expect(response.status).toBe(403);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects unsupported justification file types', async () => {
    const findUnique = vi.spyOn(prisma.attendance, 'findUnique');
    const response = await request(app).post('/api/portal/presenca/justificativa')
      .set('Authorization', `Bearer ${token}`).field('attendanceId', 'attendance-1')
      .attach('file', Buffer.from('script'), { filename: 'script.exe', contentType: 'application/x-msdownload' });
    expect(response.status).toBe(400);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('rejects spoofed justification content and removes the temporary file', async () => {
    const before = uploadedFiles();
    const findUnique = vi.spyOn(prisma.attendance, 'findUnique');
    const response = await request(app).post('/api/portal/presenca/justificativa')
      .set('Authorization', `Bearer ${token}`).field('attendanceId', 'attendance-1')
      .attach('file', Buffer.from('not really a pdf'), { filename: 'resumo.pdf', contentType: 'application/pdf' });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Conteúdo do arquivo inválido' });
    expect(findUnique).not.toHaveBeenCalled();
    expect(uploadedFiles()).toEqual(before);
  });

  it('rejects justification files larger than 20MB', async () => {
    const before = uploadedFiles();
    const response = await request(app).post('/api/portal/presenca/justificativa')
      .set('Authorization', `Bearer ${token}`).field('attendanceId', 'attendance-1')
      .attach('file', Buffer.alloc(20 * 1024 * 1024 + 1), { filename: 'resumo.pdf', contentType: 'application/pdf' });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Arquivo muito grande. Máximo 20MB.' });
    expect(uploadedFiles()).toEqual(before);
  });

  it('keeps the previous justification until replacement commits', async () => {
    vi.spyOn(prisma.attendance, 'findUnique').mockResolvedValue({
      id: 'attendance-1', studentId: 'student-1', status: 'ABSENT', lesson: { disciplines: [{ id: 'discipline-1' }] }
    } as never);
    const tx = {
      absenceJustification: {
        findUnique: vi.fn().mockResolvedValue({ id: 'old-justification', filePath: 'old-file.pdf' }),
        update: vi.fn().mockResolvedValue({
          id: 'old-justification', student: { name: 'Student' }, discipline: { name: 'Discipline' }
        }),
        create: vi.fn()
      },
      notification: { create: vi.fn().mockResolvedValue({}) }
    };
    const transaction = vi.spyOn(prisma, '$transaction').mockImplementation((async (
      callback: (client: typeof tx) => Promise<unknown>
    ) => callback(tx)) as never);
    const directDelete = vi.spyOn(prisma.absenceJustification, 'delete');
    const response = await request(app).post('/api/portal/presenca/justificativa')
      .set('Authorization', `Bearer ${token}`).field('attendanceId', 'attendance-1')
      .attach('file', pdfContents, { filename: 'resumo.pdf', contentType: 'application/pdf' });
    expect(response.status).toBe(201);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.absenceJustification.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'old-justification' }, data: expect.objectContaining({ status: 'PENDING_REVIEW' })
    }));
    expect(tx.notification.create).toHaveBeenCalledTimes(1);
    expect(directDelete).not.toHaveBeenCalled();
    const newPath = (tx.absenceJustification.update.mock.calls[0][0] as { data: { filePath: string } }).data.filePath;
    if (fs.existsSync(newPath)) fs.unlinkSync(newPath);
  });

  it('removes a newly uploaded file when persistence fails unexpectedly', async () => {
    const before = uploadedFiles();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(prisma.attendance, 'findUnique').mockRejectedValue(new Error('database unavailable'));
    const response = await request(app).post('/api/portal/presenca/justificativa')
      .set('Authorization', `Bearer ${token}`).field('attendanceId', 'attendance-1')
      .attach('file', pdfContents, { filename: 'resumo.pdf', contentType: 'application/pdf' });
    expect(response.status).toBe(500);
    expect(uploadedFiles()).toEqual(before);
  });

  it('creates a justification using only authenticated student context', async () => {
    vi.spyOn(prisma.attendance, 'findUnique').mockResolvedValue({
      id: 'attendance-1', studentId: 'student-1', status: 'ABSENT', lesson: { disciplines: [{ id: 'discipline-1' }] }
    } as never);
    const tx = {
      absenceJustification: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: 'justification-1', student: { name: 'Student' }, discipline: { name: 'Discipline' }
        })
      },
      notification: { create: vi.fn().mockResolvedValue({}) }
    };
    vi.spyOn(prisma, '$transaction').mockImplementation((async (
      callback: (client: typeof tx) => Promise<unknown>
    ) => callback(tx)) as never);
    const response = await request(app).post('/api/portal/presenca/justificativa')
      .set('Authorization', `Bearer ${token}`).field('attendanceId', 'attendance-1').field('studentId', 'attacker')
      .attach('file', pdfContents, { filename: 'resumo.pdf', contentType: 'application/pdf' });
    expect(response.status).toBe(201);
    expect(tx.absenceJustification.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      studentId: 'student-1', attendanceId: 'attendance-1', disciplineId: 'discipline-1', mimeType: 'application/pdf'
    }) }));
    expect(tx.notification.create).toHaveBeenCalledTimes(1);
    const uploadedPath = (tx.absenceJustification.create.mock.calls[0][0] as { data: { filePath: string } }).data.filePath;
    if (fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
  });

  it('returns report-card rows scoped to the authenticated student', async () => {
    const findMany = vi.spyOn(prisma.grade, 'findMany').mockResolvedValue([]);
    const response = await request(app).get('/api/portal/boletim').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { studentId: 'student-1', disciplineId: { in: ['discipline-1'] } }
    }));
  });

  it('returns mobile attendance summaries scoped to the student and disciplines', async () => {
    const findMany = vi.spyOn(prisma.discipline, 'findMany');
    findMany.mockResolvedValueOnce([{ id: 'discipline-1' }] as never).mockResolvedValueOnce([] as never);
    const response = await request(app).get('/api/portal/presenca/pendencias').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
    expect(findMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { id: { in: ['discipline-1'] } }
    }));
  });

  it('calculates attendance thresholds and pending justifications from actual justification state', async () => {
    const findMany = vi.spyOn(prisma.discipline, 'findMany');
    findMany.mockResolvedValueOnce([{ id: 'discipline-1' }] as never).mockResolvedValueOnce([{
      id: 'discipline-1', name: 'Discipline', lessons: [
        { attendances: [{ status: 'ABSENT', justification: null }] },
        { attendances: [{ status: 'ABSENT', justification: { status: 'PENDING_REVIEW' } }] },
        { attendances: [{ status: 'ABSENT', justification: { status: 'REJECTED' } }] },
        { attendances: [{ status: 'PRESENT', justification: null }] }
      ]
    }] as never);

    const response = await request(app).get('/api/portal/presenca/pendencias').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body[0]).toEqual(expect.objectContaining({
      totalLessons: 4, absences: 3, status: 'AUTO_FAILED', pendingJustifications: 3
    }));
    expect(findMany).toHaveBeenLastCalledWith(expect.objectContaining({
      select: expect.objectContaining({
        lessons: expect.objectContaining({
          select: { attendances: { where: { studentId: 'student-1' }, select: { status: true, justification: { select: { status: true } } } } }
        })
      })
    }));
  });

  it('lists only published exams from the authenticated student disciplines', async () => {
    const findMany = vi.spyOn(prisma.exam, 'findMany').mockResolvedValue([]);
    const response = await request(app).get('/api/portal/provas').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { disciplineId: { in: ['discipline-1'] }, isPublished: true }
    }));
  });

  it('returns questions without correct-answer flags for an authorized exam', async () => {
    const findFirst = vi.spyOn(prisma.exam, 'findFirst').mockResolvedValue({
      questions: [{ id: 'question-1', statement: 'Question?', alternatives: [{ id: 'alt-1', text: 'Answer' }] }]
    } as never);
    const response = await request(app).get('/api/portal/provas/exam-1/questoes').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 'question-1', text: 'Question?', alternatives: [{ id: 'alt-1', text: 'Answer' }] }]);
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'exam-1', disciplineId: { in: ['discipline-1'] }, isPublished: true }
    }));
  });

  it('submits an authorized exam using the JWT-derived student id', async () => {
    vi.spyOn(prisma.exam, 'findFirst').mockResolvedValue({
      id: 'exam-1', title: 'Exam', disciplineId: 'discipline-1',
      startDate: new Date(Date.now() - 1000), endDate: new Date(Date.now() + 1000),
      questions: [{ id: 'question-1', weight: 2, statement: 'Q', alternatives: [
        { id: 'alt-1', isCorrect: true, letter: 'A', text: 'Yes' }
      ] }]
    } as never);
    const tx = {
      examSubmission: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'submission-1' }),
        update: vi.fn().mockResolvedValue({})
      },
      studentAnswer: { upsert: vi.fn().mockResolvedValue({}) },
      grade: { upsert: vi.fn().mockResolvedValue({}) }
    };
    const transaction = vi.spyOn(prisma, '$transaction').mockImplementation((async (
      callback: (client: typeof tx) => Promise<unknown>
    ) => callback(tx)) as never);

    const response = await request(app)
      .post('/api/portal/provas/exam-1/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ studentId: 'attacker-student', answers: { 'question-1': 'alt-1' } });

    expect(response.status).toBe(200);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.examSubmission.create).toHaveBeenCalledWith({ data: expect.objectContaining({ studentId: 'student-1' }) });
    expect(tx.grade.upsert).toHaveBeenCalledTimes(1);
  });

  it('rejects duplicate answers before starting a transaction', async () => {
    vi.spyOn(prisma.exam, 'findFirst').mockResolvedValue({
      id: 'exam-1', title: 'Exam', disciplineId: 'discipline-1',
      startDate: new Date(Date.now() - 1000), endDate: new Date(Date.now() + 1000),
      questions: [{ id: 'question-1', weight: 1, statement: 'Q', alternatives: [{ id: 'alt-1', isCorrect: true }] }]
    } as never);
    const transaction = vi.spyOn(prisma, '$transaction');

    const response = await request(app).post('/api/portal/provas/exam-1/submit')
      .set('Authorization', `Bearer ${token}`).send({ answers: [
        { questionId: 'question-1', alternativeId: 'alt-1' },
        { questionId: 'question-1', alternativeId: 'alt-1' }
      ] });

    expect(response.status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });

  it.each([
    null,
    [null],
    [{ questionId: 1, alternativeId: 'alt-1' }],
    [{ questionId: 'question-1' }]
  ])('rejects malformed answers before starting a transaction: %j', async (answers) => {
    vi.spyOn(prisma.exam, 'findFirst').mockResolvedValue({
      id: 'exam-1', title: 'Exam', disciplineId: 'discipline-1',
      startDate: new Date(Date.now() - 1000), endDate: new Date(Date.now() + 1000), questions: []
    } as never);
    const transaction = vi.spyOn(prisma, '$transaction');
    const response = await request(app).post('/api/portal/provas/exam-1/submit')
      .set('Authorization', `Bearer ${token}`).send({ answers });
    expect(response.status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects questions and alternatives that do not belong to the exam', async () => {
    vi.spyOn(prisma.exam, 'findFirst').mockResolvedValue({
      id: 'exam-1', title: 'Exam', disciplineId: 'discipline-1',
      startDate: new Date(Date.now() - 1000), endDate: new Date(Date.now() + 1000),
      questions: [{ id: 'question-1', weight: 1, statement: 'Q', alternatives: [{ id: 'alt-1', isCorrect: true }] }]
    } as never);
    const transaction = vi.spyOn(prisma, '$transaction');
    for (const answers of [
      [{ questionId: 'question-2', alternativeId: 'alt-1' }],
      [{ questionId: 'question-1', alternativeId: 'alt-other-question' }]
    ]) {
      const response = await request(app).post('/api/portal/provas/exam-1/submit')
        .set('Authorization', `Bearer ${token}`).send({ answers });
      expect(response.status).toBe(400);
    }
    expect(transaction).not.toHaveBeenCalled();
  });

  it('uses the exam-grade composite key to upsert exactly once inside the transaction', async () => {
    vi.spyOn(prisma.exam, 'findFirst').mockResolvedValue({
      id: 'exam-1', title: 'Exam', disciplineId: 'discipline-1',
      startDate: new Date(Date.now() - 1000), endDate: new Date(Date.now() + 1000), questions: []
    } as never);
    const tx = {
      examSubmission: { findUnique: vi.fn().mockResolvedValue({ id: 'submission-1', submittedAt: null }), update: vi.fn() },
      studentAnswer: { upsert: vi.fn() },
      grade: { upsert: vi.fn() }
    };
    vi.spyOn(prisma, '$transaction').mockImplementation((async (
      callback: (client: typeof tx) => Promise<unknown>
    ) => callback(tx)) as never);
    const response = await request(app).post('/api/portal/provas/exam-1/submit')
      .set('Authorization', `Bearer ${token}`).send({ answers: [] });
    expect(response.status).toBe(200);
    expect(tx.grade.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { studentId_examId: { studentId: 'student-1', examId: 'exam-1' } },
      create: expect.objectContaining({ studentId: 'student-1', examId: 'exam-1' }),
      update: expect.objectContaining({ score: 0 })
    }));
    expect(tx.grade.upsert).toHaveBeenCalledTimes(1);
  });

  it('stops before grade persistence when submission finalization fails inside the transaction', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(prisma.exam, 'findFirst').mockResolvedValue({
      id: 'exam-1', title: 'Exam', disciplineId: 'discipline-1',
      startDate: new Date(Date.now() - 1000), endDate: new Date(Date.now() + 1000), questions: []
    } as never);
    const tx = {
      examSubmission: {
        findUnique: vi.fn().mockResolvedValue({ id: 'submission-1', submittedAt: null }),
        update: vi.fn().mockRejectedValue(new Error('finalization failed'))
      },
      studentAnswer: { upsert: vi.fn() },
      grade: { upsert: vi.fn() }
    };
    const transaction = vi.spyOn(prisma, '$transaction').mockImplementation((async (
      callback: (client: typeof tx) => Promise<unknown>
    ) => callback(tx)) as never);

    const response = await request(app).post('/api/portal/provas/exam-1/submit')
      .set('Authorization', `Bearer ${token}`).send({ answers: [] });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: 'Erro interno do servidor' });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.examSubmission.update).toHaveBeenCalledTimes(1);
    expect(tx.grade.upsert).not.toHaveBeenCalled();
  });

  it('returns a controlled 500 when an async portal query fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(prisma.lesson, 'findMany').mockRejectedValue(new Error('database unavailable'));
    const response = await request(app).get('/api/portal/aulas').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: 'Erro interno do servidor' });
  });
});
