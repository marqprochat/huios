import express, { NextFunction, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { prisma } from '../services/prisma';
import { getJwtSecret } from '../utils/jwtSecret';

const JWT_SECRET = getJwtSecret();

export interface AuthRequest extends express.Request {
  user?: any;
}

function isIdentityPayload(payload: string | JwtPayload): payload is JwtPayload & { id: string } {
  return typeof payload !== 'string' && typeof payload.id === 'string';
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const [scheme, token] = authHeader?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    if (!isIdentityPayload(payload)) {
      return res.status(403).json({ message: 'Token is invalid or expired' });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
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

    if (!user || !user.active) {
      return res.status(403).json({ message: 'Usuário inativo ou não encontrado' });
    }

    const activeAdminRole = user.adminRole?.active ? user.adminRole : null;

    req.user = {
      id: user.id,
      email: user.email,
      role: activeAdminRole?.key ?? user.role,
      isStudent: Boolean(user.student),
      isAdmin: Boolean(activeAdminRole),
      mustChangePassword: user.mustChangePassword,
      studentId: user.student?.id ?? null,
      teamMemberId: user.teamMember?.id ?? null,
      adminRole: activeAdminRole
        ? {
            id: activeAdminRole.id,
            key: activeAdminRole.key,
            name: activeAdminRole.name
          }
        : null,
      permissions: activeAdminRole
        ? activeAdminRole.permissions.map(({ permission }) => permission.key)
        : []
    };

    const requestPath = `${req.baseUrl}${req.path}`.replace(/\/+$/, '');
    if (user.mustChangePassword && requestPath !== '/api/auth/me') {
      return res.status(403).json({
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Troca de senha obrigatória'
      });
    }

    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return res.status(403).json({ message: 'Token is invalid or expired' });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
};
