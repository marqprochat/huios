import { getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'

import { PERMISSIONS, type PermissionKey } from './catalog'

export interface AccessContext {
  userId: string
  name: string
  email: string
  active: true
  isStudent: boolean
  isAdmin: boolean
  isSuperAdmin: boolean
  mustChangePassword: boolean
  teamMemberId: string | null
  assignedClassIds: string[]
  role: { id: string; key: string; name: string } | null
  permissions: Set<PermissionKey>
}

export interface AccessUserRecord {
  id: string
  name: string
  email: string
  active: boolean
  mustChangePassword: boolean
  student: { id: string } | null
  teamMember: {
    id: string
    active: boolean
    courseClassAssignments: Array<{ courseClassId: string }>
  } | null
  adminRole: {
    id: string
    key: string
    name: string
    active: boolean
    protected: boolean
    permissions: Array<{ permission: { key: string } }>
  } | null
}

export interface AccessContextDependencies {
  getSession(): Promise<{ userId: string } | null>
  findUserById(userId: string): Promise<AccessUserRecord | null>
}

const permissionKeys = new Set<string>(PERMISSIONS.map(({ key }) => key))

function isPermissionKey(key: string): key is PermissionKey {
  return permissionKeys.has(key)
}

async function findUserById(userId: string): Promise<AccessUserRecord | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      mustChangePassword: true,
      student: {
        select: { id: true },
      },
      teamMember: {
        select: {
          id: true,
          active: true,
          courseClassAssignments: {
            where: { active: true },
            select: { courseClassId: true },
          },
        },
      },
      adminRole: {
        select: {
          id: true,
          key: true,
          name: true,
          active: true,
          protected: true,
          permissions: {
            select: {
              permission: {
                select: { key: true },
              },
            },
          },
        },
      },
    },
  })
}

const defaultDependencies: AccessContextDependencies = {
  getSession,
  findUserById,
}

export async function resolveAccessContext(
  dependencies: AccessContextDependencies,
): Promise<AccessContext | null> {
  const session = await dependencies.getSession()
  if (!session?.userId) return null

  const user = await dependencies.findUserById(session.userId)
  if (!user?.active) return null

  const activeRole = user.adminRole?.active ? user.adminRole : null
  const permissions = new Set<PermissionKey>()

  if (activeRole) {
    for (const { permission } of activeRole.permissions) {
      if (isPermissionKey(permission.key)) {
        permissions.add(permission.key)
      }
    }
  }

  const activeTeamMember = user.teamMember?.active ? user.teamMember : null

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    active: true,
    isStudent: user.student !== null,
    isAdmin: activeRole !== null,
    isSuperAdmin: (
      activeRole?.key === 'SUPER_ADMIN' &&
      activeRole.protected === true
    ),
    mustChangePassword: user.mustChangePassword,
    teamMemberId: activeTeamMember?.id ?? null,
    assignedClassIds: activeTeamMember?.courseClassAssignments.map(
      ({ courseClassId }) => courseClassId,
    ) ?? [],
    role: activeRole
      ? { id: activeRole.id, key: activeRole.key, name: activeRole.name }
      : null,
    permissions,
  }
}

export async function getAccessContext(): Promise<AccessContext | null> {
  return resolveAccessContext(defaultDependencies)
}

export function canAccess(
  context: AccessContext,
  key: PermissionKey,
): boolean {
  return context.isSuperAdmin || context.permissions.has(key)
}

export class AuthenticationRequiredError extends Error {
  readonly code = 'AUTHENTICATION_REQUIRED'
  readonly status = 401

  constructor(message = 'Autenticação necessária.') {
    super(message)
    this.name = 'AuthenticationRequiredError'
  }
}

export class ForbiddenError extends Error {
  readonly code = 'FORBIDDEN'
  readonly status = 403

  constructor(message = 'Acesso negado.') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export function createAuthorizationGuards(
  resolveContext: () => Promise<AccessContext | null>,
) {
  async function authenticated(): Promise<AccessContext> {
    const context = await resolveContext()
    if (!context) throw new AuthenticationRequiredError()
    return context
  }

  function rejectPendingPassword(context: AccessContext): void {
    if (context.mustChangePassword) {
      throw new ForbiddenError('Troque sua senha antes de continuar.')
    }
  }

  return {
    requireAuthenticated: authenticated,
    async requirePermission(key: PermissionKey): Promise<AccessContext> {
      const context = await authenticated()
      rejectPendingPassword(context)
      if (!canAccess(context, key)) throw new ForbiddenError()
      return context
    },
    async requireSuperAdmin(): Promise<AccessContext> {
      const context = await authenticated()
      rejectPendingPassword(context)
      if (!context.isSuperAdmin) throw new ForbiddenError()
      return context
    },
  }
}

const authorizationGuards = createAuthorizationGuards(getAccessContext)

export async function requireAuthenticated(): Promise<AccessContext> {
  return authorizationGuards.requireAuthenticated()
}

export async function requirePermission(
  key: PermissionKey,
): Promise<AccessContext> {
  return authorizationGuards.requirePermission(key)
}

export async function requireSuperAdmin(): Promise<AccessContext> {
  return authorizationGuards.requireSuperAdmin()
}
