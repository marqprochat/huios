import { redirect } from 'next/navigation'

import type { PermissionKey } from './catalog'
import {
  AuthenticationRequiredError,
  ForbiddenError,
  requireAuthenticated,
  requirePermission,
  type AccessContext,
} from './server'

export async function requirePageAccess(
  permission?: PermissionKey,
): Promise<AccessContext> {
  try {
    if (permission) {
      return await requirePermission(permission)
    }
    return await requireAuthenticated()
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      redirect('/login')
    }
    if (error instanceof ForbiddenError) {
      redirect('/acesso-negado')
    }
    throw error
  }
}
