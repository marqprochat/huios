import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../services/prisma';
import { AuthRequest } from '../middlewares/auth';
import { getJwtSecret } from '../utils/jwtSecret';

const JWT_SECRET = getJwtSecret();

export const login = async (req: Request, res: Response) => {
  const email = typeof req.body.email === 'string'
    ? req.body.email.trim().toLowerCase()
    : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  try {
    if (!email || !password) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
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
      }
    });

    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    if (!user.active) {
      return res.status(403).json({ message: 'Usuário inativo' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const activeAdminRole = user.adminRole?.active ? user.adminRole : null;
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: activeAdminRole?.key ?? user.role,
        mustChangePassword: user.mustChangePassword
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: activeAdminRole?.key ?? user.role,
        isStudent: Boolean(user.student),
        isAdmin: Boolean(activeAdminRole),
        mustChangePassword: user.mustChangePassword,
        adminRole: activeAdminRole
          ? {
              id: activeAdminRole.id,
              key: activeAdminRole.key,
              name: activeAdminRole.name
            }
          : null
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        mustChangePassword: true,
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
        },
        student: {
          select: {
            id: true,
            name: true,
            phone: true,
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
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const activeAdminRole = user.adminRole?.active ? user.adminRole : null;

    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: activeAdminRole?.key ?? user.role,
      isStudent: Boolean(user.student),
      isAdmin: Boolean(activeAdminRole),
      mustChangePassword: user.mustChangePassword,
      adminRole: activeAdminRole
        ? {
            id: activeAdminRole.id,
            key: activeAdminRole.key,
            name: activeAdminRole.name
          }
        : null,
      permissions: activeAdminRole
        ? activeAdminRole.permissions.map(({ permission }) => permission.key)
        : [],
      teamMember: user.teamMember,
      student: user.student
        ? {
            ...user.student,
            enrollments: user.student.enrollments.map(({ class: courseClass, ...enrollment }) => ({
              ...enrollment,
              courseClass
            }))
          }
        : null
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
};
