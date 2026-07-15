import request from 'supertest';
import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../app';
import { prisma } from '../services/prisma';

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
      request(app).post('/api/portal/provas/exam-1/submit').send({ answers: {} })
    ];
    const responses = await Promise.all(calls);
    expect(responses.map(({ status }) => status)).toEqual([401, 401, 401, 401, 401, 401, 401]);
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
    vi.spyOn(prisma.examSubmission, 'findUnique').mockResolvedValue(null);
    vi.spyOn(prisma.exam, 'findFirst').mockResolvedValue({
      id: 'exam-1', title: 'Exam', disciplineId: 'discipline-1',
      startDate: new Date(Date.now() - 1000), endDate: new Date(Date.now() + 1000),
      questions: [{ id: 'question-1', weight: 2, statement: 'Q', alternatives: [
        { id: 'alt-1', isCorrect: true, letter: 'A', text: 'Yes' }
      ] }]
    } as never);
    const createSubmission = vi.spyOn(prisma.examSubmission, 'create').mockResolvedValue({ id: 'submission-1' } as never);
    vi.spyOn(prisma.studentAnswer, 'upsert').mockResolvedValue({} as never);
    vi.spyOn(prisma.examSubmission, 'update').mockResolvedValue({} as never);
    vi.spyOn(prisma.grade, 'create').mockResolvedValue({} as never);

    const response = await request(app)
      .post('/api/portal/provas/exam-1/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ studentId: 'attacker-student', answers: { 'question-1': 'alt-1' } });

    expect(response.status).toBe(200);
    expect(createSubmission).toHaveBeenCalledWith({ data: expect.objectContaining({ studentId: 'student-1' }) });
  });

  it('returns a controlled 500 when an async portal query fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(prisma.lesson, 'findMany').mockRejectedValue(new Error('database unavailable'));
    const response = await request(app).get('/api/portal/aulas').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: 'Erro interno do servidor' });
  });
});
