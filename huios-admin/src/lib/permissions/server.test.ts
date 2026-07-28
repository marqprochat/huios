import assert from 'node:assert/strict'
import test from 'node:test'

import type { PermissionKey } from './catalog'
import {
  AuthenticationRequiredError,
  ForbiddenError,
  canAccess,
  createAuthorizationGuards,
  resolveAccessContext,
  type AccessContextDependencies,
  type AccessUserRecord,
} from './server'

function userRecord(overrides: Partial<AccessUserRecord> = {}): AccessUserRecord {
  return {
    id: 'user-1',
    name: 'Usuário',
    email: 'usuario@example.com',
    active: true,
    mustChangePassword: false,
    student: null,
    teamMember: null,
    adminRole: null,
    ...overrides,
  }
}

function dependencies(
  record: AccessUserRecord | null,
  userId: string | null = 'user-1',
): AccessContextDependencies {
  return {
    getSession: async () => userId ? { userId } : null,
    findUserById: async (requestedUserId) => {
      assert.equal(requestedUserId, userId)
      return record
    },
  }
}

function role(
  overrides: Partial<NonNullable<AccessUserRecord['adminRole']>> = {},
): NonNullable<AccessUserRecord['adminRole']> {
  return {
    id: 'role-1',
    key: 'COORDENADOR',
    name: 'Coordenador',
    active: true,
    protected: false,
    permissions: [{ permission: { key: 'alunos.visualizar' } }],
    ...overrides,
  }
}

test('returns null for a missing session or inactive user', async () => {
  assert.equal(await resolveAccessContext(dependencies(userRecord(), null)), null)
  assert.equal(
    await resolveAccessContext(dependencies(userRecord({ active: false }))),
    null,
  )
})

test('an inactive role removes only the administrative context', async () => {
  const context = await resolveAccessContext(dependencies(userRecord({
    student: { id: 'student-1' },
    adminRole: role({ active: false }),
  })))

  assert.ok(context)
  assert.equal(context.isStudent, true)
  assert.equal(context.isAdmin, false)
  assert.equal(context.isSuperAdmin, false)
  assert.equal(context.role, null)
  assert.deepEqual([...context.permissions], [])
})

test('Super Admin bypass requires both the protected flag and key', async () => {
  const context = await resolveAccessContext(dependencies(userRecord({
    adminRole: role({
      key: 'SUPER_ADMIN',
      name: 'Super Administrador',
      protected: true,
      permissions: [],
    }),
  })))

  assert.ok(context)
  assert.equal(context.isSuperAdmin, true)
  assert.equal(canAccess(context, 'financeiro.excluir'), true)

  const unprotected = await resolveAccessContext(dependencies(userRecord({
    adminRole: role({ key: 'SUPER_ADMIN', protected: false, permissions: [] }),
  })))

  assert.ok(unprotected)
  assert.equal(unprotected.isSuperAdmin, false)
  assert.equal(canAccess(unprotected, 'financeiro.excluir'), false)
})

test('explicit permissions allow their key and deny absent keys', async () => {
  const context = await resolveAccessContext(dependencies(userRecord({
    adminRole: role({
      permissions: [
        { permission: { key: 'alunos.visualizar' } },
        { permission: { key: 'turmas.editar' } },
      ],
    }),
  })))

  assert.ok(context)
  assert.equal(canAccess(context, 'alunos.visualizar'), true)
  assert.equal(canAccess(context, 'alunos.excluir'), false)
})

test('supports student-only and dual student/admin contexts', async () => {
  const studentOnly = await resolveAccessContext(dependencies(userRecord({
    student: { id: 'student-1' },
  })))
  assert.ok(studentOnly)
  assert.equal(studentOnly.isStudent, true)
  assert.equal(studentOnly.isAdmin, false)

  const dual = await resolveAccessContext(dependencies(userRecord({
    student: { id: 'student-1' },
    adminRole: role(),
  })))
  assert.ok(dual)
  assert.equal(dual.isStudent, true)
  assert.equal(dual.isAdmin, true)
})

test('returns the active team member assigned class ids', async () => {
  const context = await resolveAccessContext(dependencies(userRecord({
    teamMember: {
      id: 'member-1',
      active: true,
      courseClassAssignments: [
        { courseClassId: 'class-1' },
        { courseClassId: 'class-2' },
      ],
    },
  })))

  assert.ok(context)
  assert.equal(context.teamMemberId, 'member-1')
  assert.deepEqual(context.assignedClassIds, ['class-1', 'class-2'])
})

test('authorization guards distinguish authentication and permission failures', async () => {
  const unauthenticated = createAuthorizationGuards(async () => null)
  await assert.rejects(
    unauthenticated.requireAuthenticated(),
    AuthenticationRequiredError,
  )

  const context = await resolveAccessContext(dependencies(userRecord({
    adminRole: role(),
  })))
  assert.ok(context)
  const guards = createAuthorizationGuards(async () => context)

  await assert.doesNotReject(guards.requirePermission('alunos.visualizar'))
  await assert.rejects(
    guards.requirePermission('alunos.excluir'),
    ForbiddenError,
  )
})

test('password-change-pending users are rejected for ordinary operations', async () => {
  const context = await resolveAccessContext(dependencies(userRecord({
    mustChangePassword: true,
    adminRole: role({
      key: 'SUPER_ADMIN',
      protected: true,
      permissions: [],
    }),
  })))
  assert.ok(context)

  const guards = createAuthorizationGuards(async () => context)
  await assert.doesNotReject(guards.requireAuthenticated())
  await assert.rejects(
    guards.requirePermission('alunos.visualizar'),
    ForbiddenError,
  )
  await assert.rejects(guards.requireSuperAdmin(), ForbiddenError)
})

test('unknown permission rows are not added to the typed context', async () => {
  const context = await resolveAccessContext(dependencies(userRecord({
    adminRole: role({
      permissions: [
        { permission: { key: 'alunos.visualizar' } },
        { permission: { key: 'inventado.executar' } },
      ],
    }),
  })))

  assert.ok(context)
  assert.deepEqual(
    [...context.permissions],
    ['alunos.visualizar'] satisfies PermissionKey[],
  )
})
