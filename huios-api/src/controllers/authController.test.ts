import express from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { app } from '../app';
import { AuthRequest, authenticateToken } from '../middlewares/auth';
import { prisma } from '../services/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'huios-secret-key-change-in-production';

const activeAccessUser = {
  id: 'user-1',
  name: 'Ana Souza',
  email: 'ana@example.com',
  role: 'ALUNO',
  active: true,
  mustChangePassword: false,
  student: { id: 'student-1' },
  teamMember: { id: 'member-1' },
  adminRole: {
    id: 'role-1',
    key: 'COORDENADOR',
    name: 'Coordenador',
    active: true,
    permissions: [
      { permission: { key: 'alunos.visualizar' } },
      { permission: { key: 'turmas.visualizar' } }
    ]
  }
};

function identityToken(overrides: Record<string, unknown> = {}) {
  return jwt.sign(
    { id: 'user-1', email: 'ana@example.com', ...overrides },
    JWT_SECRET
  );
}

describe('POST /api/auth/login', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes email and signs only identity, routing hints, and no permission authority', async () => {
    const findUnique = vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      ...activeAccessUser,
      password: 'stored-hash',
      mustChangePassword: true
    } as never);
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: '  ANA@Example.COM ', password: 'temporary-password' });

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual({
      id: 'user-1',
      name: 'Ana Souza',
      email: 'ana@example.com',
      role: 'COORDENADOR',
      isStudent: true,
      isAdmin: true,
      mustChangePassword: true,
      adminRole: {
        id: 'role-1',
        key: 'COORDENADOR',
        name: 'Coordenador'
      }
    });
    expect(response.body.user).not.toHaveProperty('password');
    expect(findUnique).toHaveBeenCalledWith({
      where: { email: 'ana@example.com' },
      select: expect.objectContaining({
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        active: true,
        mustChangePassword: true,
        student: { select: { id: true } },
        adminRole: {
          select: {
            id: true,
            key: true,
            name: true,
            active: true
          }
        }
      })
    });

    const claims = jwt.verify(response.body.token, JWT_SECRET) as jwt.JwtPayload;
    expect(claims).toMatchObject({
      id: 'user-1',
      email: 'ana@example.com',
      role: 'COORDENADOR',
      mustChangePassword: true
    });
    expect(claims).not.toHaveProperty('permissions');
  });

  it('rejects an inactive account before checking its password', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      ...activeAccessUser,
      active: false,
      password: 'stored-hash'
    } as never);
    const compare = vi.spyOn(bcrypt, 'compare');

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@example.com', password: 'password' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: 'Usuário inativo' });
    expect(compare).not.toHaveBeenCalled();
  });

  it('rejects invalid credentials without exposing account details', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'unknown@example.com', password: 'password' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Credenciais inválidas' });
  });
});

describe('authenticateToken', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('re-reads current access and ignores legacy authority claims in the token', async () => {
    const findUnique = vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(activeAccessUser as never);
    const protectedApp = express();
    protectedApp.get('/api/protected', authenticateToken, (req: AuthRequest, res) => {
      res.json(req.user);
    });
    const token = identityToken({
      role: 'SUPER_ADMIN',
      permissions: ['equipe.excluir']
    });

    const response = await request(protectedApp)
      .get('/api/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 'user-1',
      email: 'ana@example.com',
      role: 'COORDENADOR',
      isStudent: true,
      isAdmin: true,
      mustChangePassword: false,
      studentId: 'student-1',
      teamMemberId: 'member-1',
      adminRole: {
        id: 'role-1',
        key: 'COORDENADOR',
        name: 'Coordenador'
      },
      permissions: ['alunos.visualizar', 'turmas.visualizar']
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: {
        id: true,
        email: true,
        role: true,
        active: true,
        mustChangePassword: true,
        student: { select: { id: true } },
        teamMember: { select: { id: true } },
        adminRole: {
          select: {
            id: true,
            key: true,
            name: true,
            active: true,
            permissions: {
              select: {
                permission: { select: { key: true } }
              }
            }
          }
        }
      }
    });
  });

  it('rejects an account deactivated after its token was issued', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      ...activeAccessUser,
      active: false
    } as never);

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${identityToken()}`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: 'Usuário inativo ou não encontrado' });
  });

  it('blocks protected operations while a password change is pending', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      ...activeAccessUser,
      mustChangePassword: true
    } as never);

    const response = await request(app)
      .get('/api/portal/aulas')
      .set('Authorization', `Bearer ${identityToken({ mustChangePassword: false })}`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      code: 'PASSWORD_CHANGE_REQUIRED',
      message: 'Troca de senha obrigatória'
    });
  });
});

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

  it('allows session inspection during a pending password change and returns both contexts', async () => {
    vi.spyOn(prisma.user, 'findUnique')
      .mockResolvedValueOnce({
        ...activeAccessUser,
        mustChangePassword: true
      } as never)
      .mockResolvedValueOnce({
        id: 'user-1',
        name: 'Ana Souza',
        email: 'ana@example.com',
        role: 'ALUNO',
        mustChangePassword: true,
        teamMember: { id: 'member-1' },
        adminRole: activeAccessUser.adminRole,
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

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${identityToken()}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 'user-1',
      name: 'Ana Souza',
      email: 'ana@example.com',
      role: 'COORDENADOR',
      isStudent: true,
      isAdmin: true,
      mustChangePassword: true,
      adminRole: {
        id: 'role-1',
        key: 'COORDENADOR',
        name: 'Coordenador'
      },
      permissions: ['alunos.visualizar', 'turmas.visualizar'],
      teamMember: { id: 'member-1' },
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
  });

  it('allows the equivalent trailing-slash session route during a pending password change', async () => {
    vi.spyOn(prisma.user, 'findUnique')
      .mockResolvedValueOnce({
        ...activeAccessUser,
        mustChangePassword: true
      } as never)
      .mockResolvedValueOnce({
        id: 'user-1',
        name: 'Ana Souza',
        email: 'ana@example.com',
        role: 'ALUNO',
        mustChangePassword: true,
        teamMember: { id: 'member-1' },
        adminRole: activeAccessUser.adminRole,
        student: {
          id: 'student-1',
          name: 'Ana Souza',
          phone: null,
          enrollments: []
        }
      } as never);

    const response = await request(app)
      .get('/api/auth/me/')
      .set('Authorization', `Bearer ${identityToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.mustChangePassword).toBe(true);
  });

  it('returns a controlled 500 when current access cannot be read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(prisma.user, 'findUnique').mockRejectedValue(new Error('database unavailable'));

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${identityToken()}`);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: 'Erro interno do servidor' });
  });
});

describe('JWT secret configuration', () => {
  it('fails closed outside development and test when JWT_SECRET is missing', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousJwtSecret = process.env.JWT_SECRET;

    try {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;
      vi.resetModules();

      await expect(import('../middlewares/auth')).rejects.toThrow(
        'JWT_SECRET is required outside development and test'
      );
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;

      if (previousJwtSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = previousJwtSecret;
      vi.resetModules();
    }
  });
});
