import request from 'supertest';
import jwt from 'jsonwebtoken';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { app } from '../app';
import { prisma } from '../services/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'huios-secret-key-change-in-production';

describe('GET /api/auth/me', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects /api/auth/me without a token', async () => {
    const response = await request(app).get('/api/auth/me');
    expect(response.status).toBe(401);
  });

  it('rejects /api/auth/me with an invalid token', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(403);
  });

  it('returns the authenticated student profile with the mobile enrollment contract', async () => {
    const findUnique = vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: 'user-1',
      name: 'Ana Souza',
      email: 'ana@example.com',
      role: 'ALUNO',
      student: {
        id: 'student-1',
        name: 'Ana Souza',
        phone: '11999999999',
        enrollments: [
          {
            id: 'enrollment-1',
            status: 'CURSANDO',
            class: {
              id: 'class-1',
              name: 'Turma A',
              course: { id: 'course-1', name: 'Inglês' }
            }
          }
        ]
      }
    } as never);
    const token = jwt.sign(
      { id: 'user-1', email: 'ana@example.com', role: 'ALUNO' },
      JWT_SECRET
    );

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 'user-1',
      name: 'Ana Souza',
      email: 'ana@example.com',
      role: 'ALUNO',
      student: {
        id: 'student-1',
        name: 'Ana Souza',
        phone: '11999999999',
        enrollments: [
          {
            id: 'enrollment-1',
            status: 'CURSANDO',
            courseClass: {
              id: 'class-1',
              name: 'Turma A',
              course: { id: 'course-1', name: 'Inglês' }
            }
          }
        ]
      }
    });
    expect(response.body).not.toHaveProperty('password');
    expect(response.body).not.toHaveProperty('cpf');
    expect(response.body.student).not.toHaveProperty('password');
    expect(response.body.student).not.toHaveProperty('cpf');
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'user-1' },
      select: expect.objectContaining({
        id: true,
        name: true,
        email: true,
        role: true,
        student: {
          select: expect.objectContaining({
            enrollments: {
              where: { status: 'CURSANDO' },
              select: {
                id: true,
                status: true,
                class: {
                  select: {
                    id: true,
                    name: true,
                    course: { select: { id: true, name: true } }
                  }
                }
              }
            }
          })
        }
      })
    }));
  });

  it('returns a controlled 500 when the profile query fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(prisma.user, 'findUnique').mockRejectedValue(new Error('database unavailable'));
    const token = jwt.sign(
      { id: 'user-1', email: 'ana@example.com', role: 'ALUNO' },
      JWT_SECRET
    );

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: 'Erro interno do servidor' });
  });
});
