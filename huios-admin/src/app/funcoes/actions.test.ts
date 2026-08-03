import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createRole,
  duplicateRole,
  listRoles,
  replaceRolePermissions,
  setRoleActive,
  updateRole,
  type RoleActionDependencies,
  type RoleListItem,
  type RoleMutationClient,
  type RoleRecord,
} from './actions'

type Call = {
  operation: string
  args: unknown
}

function createHarness(options: {
  role?: RoleRecord | null
  conflict?: RoleRecord | null
  permissions?: Array<{ id: string; key: string }>
  deny?: boolean
} = {}) {
  const calls: Call[] = []
  let transactions = 0
  const role: RoleRecord | null = 'role' in options ? options.role ?? null : {
    id: 'role-1',
    key: 'COORDENADOR',
    name: 'Coordenador',
    description: 'Gestão acadêmica',
    active: true,
    protected: false,
    permissions: [
      {
        permissionId: 'permission-1',
        permission: { id: 'permission-1', key: 'alunos.visualizar' },
      },
    ],
    _count: { users: 2 },
  }

  const transactionClient: RoleMutationClient = {
    role: {
      findFirst: async (args: unknown) => {
        calls.push({ operation: 'role.findFirst', args })
        return options.conflict ?? null
      },
      findUnique: async (args: unknown) => {
        calls.push({ operation: 'role.findUnique', args })
        return role
      },
      create: async (args: unknown) => {
        calls.push({ operation: 'role.create', args })
        return {
          id: 'role-new',
          key: 'GESTAO_ACADEMICA',
          name: 'Gestão Acadêmica',
          description: null,
          active: true,
          protected: false,
        }
      },
      update: async (args: unknown) => {
        calls.push({ operation: 'role.update', args })
        if (!role) throw new Error('role not found')
        return { ...role, active: false }
      },
      findMany: async (args: unknown) => {
        calls.push({ operation: 'role.findMany', args })
        return role ? [role as RoleListItem] : []
      },
    },
    permission: {
      findMany: async (args: unknown) => {
        calls.push({ operation: 'permission.findMany', args })
        return options.permissions ?? [
          { id: 'permission-1', key: 'alunos.visualizar' },
          { id: 'permission-2', key: 'alunos.editar' },
        ]
      },
    },
    rolePermission: {
      deleteMany: async (args: unknown) => {
        calls.push({ operation: 'rolePermission.deleteMany', args })
        return { count: 1 }
      },
      createMany: async (args: unknown) => {
        calls.push({ operation: 'rolePermission.createMany', args })
        return { count: 2 }
      },
    },
    auditLog: {
      create: async (args: unknown) => {
        calls.push({ operation: 'auditLog.create', args })
        return { id: 'audit-1' }
      },
    },
  }

  const dependencies: RoleActionDependencies = {
    requireSuperAdmin: async () => {
      calls.push({ operation: 'requireSuperAdmin', args: null })
      if (options.deny) throw new Error('forbidden')
      return { userId: 'actor-1' }
    },
    getPrisma: async () => ({
      ...transactionClient,
      $transaction: async <T>(
        callback: (client: RoleMutationClient) => Promise<T>,
      ) => {
        transactions += 1
        calls.push({ operation: '$transaction', args: null })
        return callback(transactionClient)
      },
    }),
    getPermissionKeys: async () => [
      'alunos.visualizar',
      'alunos.editar',
    ],
    revalidatePath: (path: string) => {
      calls.push({ operation: 'revalidatePath', args: path })
    },
  }

  return {
    calls,
    dependencies,
    get transactions() {
      return transactions
    },
  }
}

function call(harness: ReturnType<typeof createHarness>, operation: string) {
  return harness.calls.find((entry) => entry.operation === operation)
}

test('createRole normalizes a unique key and name and audits in its transaction', async () => {
  const harness = createHarness()

  const result = await createRole(
    { name: '  Gestão   Acadêmica  ', description: '  Apoio acadêmico  ' },
    harness.dependencies,
  )

  assert.deepEqual(result, { success: true, id: 'role-new' })
  assert.equal(harness.transactions, 1)
  assert.deepEqual(call(harness, 'role.create')?.args, {
    data: {
      key: 'GESTAO_ACADEMICA',
      name: 'Gestão Acadêmica',
      description: 'Apoio acadêmico',
      active: true,
      protected: false,
    },
  })
  assert.match(
    JSON.stringify(call(harness, 'auditLog.create')?.args),
    /ROLE_CREATED/,
  )
  assert.equal(call(harness, 'revalidatePath')?.args, '/funcoes')
})

test('createRole returns a safe conflict when normalized key or name exists', async () => {
  const harness = createHarness({
    conflict: {
      id: 'existing-role',
      key: 'SECRETARIA',
      name: 'Secretaria',
      description: null,
      active: true,
      protected: false,
    },
  })

  const result = await createRole(
    { name: '  Secretaria ' },
    harness.dependencies,
  )

  assert.deepEqual(result, {
    success: false,
    error: 'Já existe uma função com este nome.',
  })
  assert.equal(call(harness, 'role.create'), undefined)
  assert.equal(call(harness, 'auditLog.create'), undefined)
})

test('duplicateRole copies grants to a new active role and audits the source', async () => {
  const harness = createHarness()

  const result = await duplicateRole(
    'role-1',
    'Coordenação Regional',
    harness.dependencies,
  )

  assert.deepEqual(result, { success: true, id: 'role-new' })
  assert.equal(harness.transactions, 1)
  assert.match(
    JSON.stringify(call(harness, 'role.create')?.args),
    /COORDENACAO_REGIONAL/,
  )
  assert.deepEqual(call(harness, 'rolePermission.createMany')?.args, {
    data: [{ roleId: 'role-new', permissionId: 'permission-1' }],
  })
  const audit = JSON.stringify(call(harness, 'auditLog.create')?.args)
  assert.match(audit, /ROLE_DUPLICATED/)
  assert.match(audit, /role-1/)
})

test('replaceRolePermissions rejects unknown catalog keys before opening a transaction', async () => {
  const harness = createHarness()

  const result = await replaceRolePermissions(
    'role-1',
    ['alunos.visualizar', 'inventado.executar'],
    harness.dependencies,
  )

  assert.deepEqual(result, {
    success: false,
    error: 'Uma ou mais permissões são inválidas.',
  })
  assert.equal(harness.transactions, 0)
  assert.equal(call(harness, 'rolePermission.deleteMany'), undefined)
})

test('replaceRolePermissions atomically replaces deduplicated grants and creates an audit event', async () => {
  const harness = createHarness()

  const result = await replaceRolePermissions(
    'role-1',
    ['alunos.visualizar', 'alunos.editar', 'alunos.visualizar'],
    harness.dependencies,
  )

  assert.deepEqual(result, { success: true })
  assert.equal(harness.transactions, 1)
  assert.deepEqual(call(harness, 'rolePermission.deleteMany')?.args, {
    where: { roleId: 'role-1' },
  })
  assert.deepEqual(call(harness, 'rolePermission.createMany')?.args, {
    data: [
      { roleId: 'role-1', permissionId: 'permission-1' },
      { roleId: 'role-1', permissionId: 'permission-2' },
    ],
  })
  assert.match(
    JSON.stringify(call(harness, 'auditLog.create')?.args),
    /ROLE_PERMISSIONS_REPLACED/,
  )
})

test('protected roles reject edits, duplication, status changes, and grant changes', async () => {
  const protectedRole = {
    id: 'super-role',
    key: 'SUPER_ADMIN',
    name: 'Super Administrador',
    description: null,
    active: true,
    protected: true,
    permissions: [],
    _count: { users: 1 },
  }

  for (const invoke of [
    (dependencies: RoleActionDependencies) => updateRole(
      'super-role',
      { name: 'Outro nome' },
      dependencies,
    ),
    (dependencies: RoleActionDependencies) => duplicateRole(
      'super-role',
      'Cópia',
      dependencies,
    ),
    (dependencies: RoleActionDependencies) => setRoleActive(
      'super-role',
      false,
      dependencies,
    ),
    (dependencies: RoleActionDependencies) => replaceRolePermissions(
      'super-role',
      ['alunos.visualizar'],
      dependencies,
    ),
  ]) {
    const harness = createHarness({ role: protectedRole })
    const result = await invoke(harness.dependencies)

    assert.deepEqual(result, {
      success: false,
      error: 'A função Super Admin é protegida e não pode ser alterada.',
    })
    assert.equal(call(harness, 'role.update'), undefined)
    assert.equal(call(harness, 'rolePermission.deleteMany'), undefined)
  }
})

test('setRoleActive deactivates an assigned role without removing assignments', async () => {
  const harness = createHarness()

  const result = await setRoleActive(
    'role-1',
    false,
    harness.dependencies,
  )

  assert.deepEqual(result, { success: true })
  assert.deepEqual(call(harness, 'role.update')?.args, {
    where: { id: 'role-1' },
    data: { active: false },
  })
  assert.equal(
    harness.calls.some(({ operation }) => operation.startsWith('user.')),
    false,
  )
  assert.match(
    JSON.stringify(call(harness, 'auditLog.create')?.args),
    /ROLE_DEACTIVATED/,
  )
})

test('every public action requires Super Admin before reading or writing roles', async () => {
  const invocations = [
    (dependencies: RoleActionDependencies) => listRoles(dependencies),
    (dependencies: RoleActionDependencies) => createRole(
      { name: 'Nova função' },
      dependencies,
    ),
    (dependencies: RoleActionDependencies) => updateRole(
      'role-1',
      { name: 'Novo nome' },
      dependencies,
    ),
    (dependencies: RoleActionDependencies) => duplicateRole(
      'role-1',
      'Cópia',
      dependencies,
    ),
    (dependencies: RoleActionDependencies) => setRoleActive(
      'role-1',
      false,
      dependencies,
    ),
    (dependencies: RoleActionDependencies) => replaceRolePermissions(
      'role-1',
      [],
      dependencies,
    ),
  ]

  for (const invoke of invocations) {
    const harness = createHarness({ deny: true })

    await assert.rejects(invoke(harness.dependencies), /forbidden/)
    assert.deepEqual(
      harness.calls.map(({ operation }) => operation),
      ['requireSuperAdmin'],
    )
  }
})
