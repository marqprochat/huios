import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../services/prisma';
import { AuthRequest } from '../middlewares/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'huios-secret-key-change-in-production';

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email }
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

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
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

  if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });

  return res.json({
    ...user,
    student: user.student ? {
      ...user.student,
      enrollments: user.student.enrollments.map(({ class: courseClass, ...enrollment }) => ({
        ...enrollment,
        courseClass
      }))
    } : undefined
  });
};
