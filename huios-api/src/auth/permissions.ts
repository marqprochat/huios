import { NextFunction, Response } from 'express'
import { AuthRequest } from '../middlewares/auth'

export type ApiPermission = `${string}.${string}`

/**
 * Server-side permission barrier. The authenticated user is reloaded from the
 * database by authenticateToken, therefore JWT role hints are never trusted.
 */
export function requireApiPermission(permission: ApiPermission) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user
    if (!user) return res.status(401).json({ message: 'NÃ£o autenticado' })
    if (user.adminRole?.key === 'SUPER_ADMIN') return next()
    if (!Array.isArray(user.permissions) || !user.permissions.includes(permission)) {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Acesso negado' })
    }
    return next()
  }
}
