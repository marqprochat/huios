'use server'

import type { PermissionKey } from '@/lib/permissions/catalog'

export type RoleActionResult = {
  success: boolean
  error?: string
  id?: string
}

export type RoleInput = {
  name: string
  description?: string | null
}

export type RoleRecord = {
  id: string
  key: string
  name: string
  description: string | null
  active: boolean
  protected: boolean
  permissions?: Array<{
    permissionId: string
    permission?: { id?: string; key: string }
  }>
  _count?: { users: number }
}

export type RoleListItem = RoleRecord & {
  _count: { users: number }
}

export type RoleDetails = Omit<RoleRecord, 'permissions' | '_count'> & {
  permissions: Array<{
    permissionId: string
    permission: { id?: string; key: string }
  }>
  _count: { users: number }
}

export interface RoleMutationClient {
  role: {
    findFirst(args: unknown): Promise<RoleRecord | null>
    findUnique(args: unknown): Promise<RoleRecord | null>
    findMany(args: unknown): Promise<RoleListItem[]>
    create(args: unknown): Promise<RoleRecord>
    update(args: unknown): Promise<RoleRecord>
  }
  permission: {
    findMany(args: unknown): Promise<Array<{ id: string; key: string }>>
  }
  rolePermission: {
    deleteMany(args: unknown): Promise<unknown>
    createMany(args: unknown): Promise<unknown>
  }
  auditLog: {
    create(args: unknown): Promise<unknown>
  }
}

export interface RoleActionsPrisma extends RoleMutationClient {
  $transaction<T>(
    callback: (client: RoleMutationClient) => Promise<T>,
  ): Promise<T>
}

export interface RoleActionDependencies {
  requirePermission?(permission: PermissionKey): Promise<{ userId: string }>
  requireSuperAdmin?(): Promise<{ userId: string }>
  getPrisma(): Promise<RoleActionsPrisma>
  getPermissionKeys(): Promise<readonly string[]>
  revalidatePath(path: string): void | Promise<void>
}

const defaultDependencies: RoleActionDependencies = {
  async requirePermission(permission: PermissionKey) {
    const authorization = await import('@/lib/permissions/server')
    return authorization.requirePermission(permission)
  },
  async getPrisma() {
    const { default: prisma } = await import('@/lib/prisma')
    return prisma as unknown as RoleActionsPrisma
  },
  async getPermissionKeys() {
    const { PERMISSIONS } = await import('@/lib/permissions/catalog')
    return PERMISSIONS.map(({ key }) => key)
  },
  async revalidatePath(path: string) {
    const cache = await import('next/cache')
    cache.revalidatePath(path)
  },
}

async function requireRolePermission(
  dependencies: RoleActionDependencies,
  permission: PermissionKey,
): Promise<{ userId: string }> {
  if (dependencies.requirePermission) {
    return dependencies.requirePermission(permission)
  }
  if (dependencies.requireSuperAdmin) {
    return dependencies.requireSuperAdmin()
  }
  throw new Error('Missing role permission guard.')
}

const PROTECTED_ROLE_ERROR =
  'A função Super Admin é protegida e não pode ser alterada.'
const ROLE_NOT_FOUND_ERROR = 'Função não encontrada.'
const ROLE_CONFLICT_ERROR = 'Já existe uma função com este nome.'

function normalizedName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizedDescription(value?: string | null): string | null {
  const description = value?.trim().replace(/\s+/g, ' ') ?? ''
  return description || null
}

function normalizedKey(value: string): string {
  return normalizedName(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
}

function validateRoleInput(input: RoleInput): {
  name?: string
  description?: string | null
  error?: string
} {
  const name = normalizedName(input.name ?? '')
  if (!name) return { error: 'Informe o nome da função.' }
  if (!normalizedKey(name)) {
    return { error: 'O nome deve conter letras ou números.' }
  }
  if (name.length > 80) {
    return { error: 'O nome deve ter no máximo 80 caracteres.' }
  }

  const description = normalizedDescription(input.description)
  if (description && description.length > 500) {
    return { error: 'A descrição deve ter no máximo 500 caracteres.' }
  }

  return { name, description }
}

function isPrismaErrorWithCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === code
  )
}

function protectedRoleResult(): RoleActionResult {
  return { success: false, error: PROTECTED_ROLE_ERROR }
}

async function revalidateFuncoes(
  dependencies: RoleActionDependencies,
  id?: string,
): Promise<void> {
  await dependencies.revalidatePath('/funcoes')
  if (id) await dependencies.revalidatePath(`/funcoes/${id}`)
}

export async function listRoles(
  dependencies: RoleActionDependencies = defaultDependencies,
): Promise<RoleListItem[]> {
  'use server'

  await requireRolePermission(dependencies, 'funcoes.visualizar')
  const prisma = await dependencies.getPrisma()

  return prisma.role.findMany({
    include: {
      _count: {
        select: { users: true },
      },
    },
    orderBy: [
      { protected: 'desc' },
      { active: 'desc' },
      { name: 'asc' },
    ],
  })
}

export async function getRole(
  id: string,
  dependencies: RoleActionDependencies = defaultDependencies,
): Promise<RoleDetails | null> {
  'use server'

  await requireRolePermission(dependencies, 'funcoes.visualizar')
  const prisma = await dependencies.getPrisma()

  return prisma.role.findUnique({
    where: { id },
    include: {
      permissions: {
        select: {
          permissionId: true,
          permission: {
            select: { id: true, key: true },
          },
        },
      },
      _count: {
        select: { users: true },
      },
    },
  }) as Promise<RoleDetails | null>
}

export async function createRole(
  input: RoleInput,
  dependencies: RoleActionDependencies = defaultDependencies,
): Promise<RoleActionResult> {
  'use server'

  const actor = await requireRolePermission(dependencies, 'funcoes.criar')
  const validation = validateRoleInput(input)
  if (validation.error || !validation.name) {
    return { success: false, error: validation.error }
  }

  const key = normalizedKey(validation.name)
  const prisma = await dependencies.getPrisma()

  try {
    const role = await prisma.$transaction(async (transaction) => {
      const conflict = await transaction.role.findFirst({
        where: {
          OR: [
            { key },
            {
              name: {
                equals: validation.name,
                mode: 'insensitive',
              },
            },
          ],
        },
      })
      if (conflict) return null

      const created = await transaction.role.create({
        data: {
          key,
          name: validation.name,
          description: validation.description ?? null,
          active: true,
          protected: false,
        },
      })

      await transaction.auditLog.create({
        data: {
          actorId: actor.userId,
          action: 'ROLE_CREATED',
          entity: 'Role',
          entityId: created.id,
          changes: {
            key: created.key,
            name: created.name,
            description: created.description,
            active: created.active,
          },
        },
      })

      return created
    })

    if (!role) return { success: false, error: ROLE_CONFLICT_ERROR }

    await revalidateFuncoes(dependencies)
    return { success: true, id: role.id }
  } catch (error) {
    if (isPrismaErrorWithCode(error, 'P2002')) {
      return { success: false, error: ROLE_CONFLICT_ERROR }
    }
    return {
      success: false,
      error: 'Não foi possível criar a função. Tente novamente.',
    }
  }
}

export async function updateRole(
  id: string,
  input: RoleInput,
  dependencies: RoleActionDependencies = defaultDependencies,
): Promise<RoleActionResult> {
  'use server'

  const actor = await requireRolePermission(dependencies, 'funcoes.editar')
  const validation = validateRoleInput(input)
  if (validation.error || !validation.name) {
    return { success: false, error: validation.error }
  }

  const prisma = await dependencies.getPrisma()

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.role.findUnique({
        where: { id },
      })
      if (!existing) return { kind: 'not-found' } as const
      if (existing.protected) return { kind: 'protected' } as const

      const conflict = await transaction.role.findFirst({
        where: {
          id: { not: id },
          name: {
            equals: validation.name,
            mode: 'insensitive',
          },
        },
      })
      if (conflict) return { kind: 'conflict' } as const

      const updated = await transaction.role.update({
        where: { id },
        data: {
          name: validation.name,
          description: validation.description ?? null,
        },
      })

      await transaction.auditLog.create({
        data: {
          actorId: actor.userId,
          action: 'ROLE_UPDATED',
          entity: 'Role',
          entityId: id,
          changes: {
            name: { from: existing.name, to: updated.name },
            description: {
              from: existing.description,
              to: updated.description,
            },
          },
        },
      })

      return { kind: 'updated' } as const
    })

    if (result.kind === 'not-found') {
      return { success: false, error: ROLE_NOT_FOUND_ERROR }
    }
    if (result.kind === 'protected') return protectedRoleResult()
    if (result.kind === 'conflict') {
      return { success: false, error: ROLE_CONFLICT_ERROR }
    }

    await revalidateFuncoes(dependencies, id)
    return { success: true }
  } catch (error) {
    if (isPrismaErrorWithCode(error, 'P2002')) {
      return { success: false, error: ROLE_CONFLICT_ERROR }
    }
    return {
      success: false,
      error: 'Não foi possível atualizar a função. Tente novamente.',
    }
  }
}

export async function duplicateRole(
  id: string,
  name: string,
  dependencies: RoleActionDependencies = defaultDependencies,
): Promise<RoleActionResult> {
  'use server'

  const actor = await requireRolePermission(dependencies, 'funcoes.criar')
  const validation = validateRoleInput({ name })
  if (validation.error || !validation.name) {
    return { success: false, error: validation.error }
  }

  const key = normalizedKey(validation.name)
  const prisma = await dependencies.getPrisma()

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const source = await transaction.role.findUnique({
        where: { id },
        include: {
          permissions: {
            select: { permissionId: true },
          },
        },
      })
      if (!source) return { kind: 'not-found' } as const
      if (source.protected) return { kind: 'protected' } as const

      const conflict = await transaction.role.findFirst({
        where: {
          OR: [
            { key },
            {
              name: {
                equals: validation.name,
                mode: 'insensitive',
              },
            },
          ],
        },
      })
      if (conflict) return { kind: 'conflict' } as const

      const duplicate = await transaction.role.create({
        data: {
          key,
          name: validation.name,
          description: source.description,
          active: true,
          protected: false,
        },
      })

      const grants = source.permissions ?? []
      if (grants.length > 0) {
        await transaction.rolePermission.createMany({
          data: grants.map(({ permissionId }) => ({
            roleId: duplicate.id,
            permissionId,
          })),
        })
      }

      await transaction.auditLog.create({
        data: {
          actorId: actor.userId,
          action: 'ROLE_DUPLICATED',
          entity: 'Role',
          entityId: duplicate.id,
          changes: {
            sourceRoleId: source.id,
            key: duplicate.key,
            name: duplicate.name,
            permissionCount: grants.length,
          },
        },
      })

      return { kind: 'duplicated', id: duplicate.id } as const
    })

    if (result.kind === 'not-found') {
      return { success: false, error: ROLE_NOT_FOUND_ERROR }
    }
    if (result.kind === 'protected') return protectedRoleResult()
    if (result.kind === 'conflict') {
      return { success: false, error: ROLE_CONFLICT_ERROR }
    }

    await revalidateFuncoes(dependencies)
    return { success: true, id: result.id }
  } catch (error) {
    if (isPrismaErrorWithCode(error, 'P2002')) {
      return { success: false, error: ROLE_CONFLICT_ERROR }
    }
    return {
      success: false,
      error: 'Não foi possível duplicar a função. Tente novamente.',
    }
  }
}

export async function setRoleActive(
  id: string,
  active: boolean,
  dependencies: RoleActionDependencies = defaultDependencies,
): Promise<RoleActionResult> {
  'use server'

  const actor = await requireRolePermission(dependencies, 'funcoes.excluir')
  const prisma = await dependencies.getPrisma()

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.role.findUnique({
        where: { id },
        include: {
          _count: {
            select: { users: true },
          },
        },
      })
      if (!existing) return { kind: 'not-found' } as const
      if (existing.protected) return { kind: 'protected' } as const

      await transaction.role.update({
        where: { id },
        data: { active },
      })
      await transaction.auditLog.create({
        data: {
          actorId: actor.userId,
          action: active ? 'ROLE_ACTIVATED' : 'ROLE_DEACTIVATED',
          entity: 'Role',
          entityId: id,
          changes: {
            active: { from: existing.active, to: active },
            assignedUsers: existing._count?.users ?? 0,
          },
        },
      })

      return { kind: 'updated' } as const
    })

    if (result.kind === 'not-found') {
      return { success: false, error: ROLE_NOT_FOUND_ERROR }
    }
    if (result.kind === 'protected') return protectedRoleResult()

    await revalidateFuncoes(dependencies, id)
    return { success: true }
  } catch {
    return {
      success: false,
      error: 'Não foi possível alterar o status da função. Tente novamente.',
    }
  }
}

export async function replaceRolePermissions(
  id: string,
  keys: string[],
  dependencies: RoleActionDependencies = defaultDependencies,
): Promise<RoleActionResult> {
  'use server'

  const actor = await requireRolePermission(dependencies, 'funcoes.editar')
  const permissionKeys = new Set(await dependencies.getPermissionKeys())
  if (
    !Array.isArray(keys) ||
    keys.some((key) => typeof key !== 'string' || !permissionKeys.has(key))
  ) {
    return {
      success: false,
      error: 'Uma ou mais permissões são inválidas.',
    }
  }

  const uniqueKeys = [...new Set(keys)]
  const prisma = await dependencies.getPrisma()

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.role.findUnique({
        where: { id },
        include: {
          permissions: {
            select: {
              permission: {
                select: { key: true },
              },
            },
          },
        },
      })
      if (!existing) return { kind: 'not-found' } as const
      if (existing.protected) return { kind: 'protected' } as const

      const permissions = uniqueKeys.length > 0
        ? await transaction.permission.findMany({
          where: { key: { in: uniqueKeys } },
          select: { id: true, key: true },
        })
        : []

      if (permissions.length !== uniqueKeys.length) {
        return { kind: 'catalog-missing' } as const
      }

      await transaction.rolePermission.deleteMany({
        where: { roleId: id },
      })
      if (permissions.length > 0) {
        const permissionIdByKey = new Map(
          permissions.map((permission) => [permission.key, permission.id]),
        )
        await transaction.rolePermission.createMany({
          data: uniqueKeys.map((key) => ({
            roleId: id,
            permissionId: permissionIdByKey.get(key) as string,
          })),
        })
      }

      const previousKeys = (existing.permissions ?? [])
        .map(({ permission }) => permission?.key)
        .filter((key): key is string => Boolean(key))
        .sort()

      await transaction.auditLog.create({
        data: {
          actorId: actor.userId,
          action: 'ROLE_PERMISSIONS_REPLACED',
          entity: 'Role',
          entityId: id,
          changes: {
            from: previousKeys,
            to: uniqueKeys,
          },
        },
      })

      return { kind: 'updated' } as const
    })

    if (result.kind === 'not-found') {
      return { success: false, error: ROLE_NOT_FOUND_ERROR }
    }
    if (result.kind === 'protected') return protectedRoleResult()
    if (result.kind === 'catalog-missing') {
      return {
        success: false,
        error: 'O catálogo de permissões não está sincronizado.',
      }
    }

    await revalidateFuncoes(dependencies, id)
    return { success: true }
  } catch {
    return {
      success: false,
      error: 'Não foi possível salvar as permissões. Tente novamente.',
    }
  }
}
