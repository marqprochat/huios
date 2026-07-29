import bcrypt from 'bcryptjs'

export const MODULE_ACTIONS = {
  dashboard: ['visualizar'],
  alunos: ['visualizar', 'criar', 'editar', 'excluir'],
  professores: ['visualizar', 'criar', 'editar', 'excluir'],
  equipe: ['visualizar', 'gerenciar'],
  funcoes: ['visualizar', 'gerenciar'],
  igrejas: ['visualizar', 'criar', 'editar', 'excluir'],
  cursos: ['visualizar', 'criar', 'editar', 'excluir'],
  turmas: ['visualizar', 'criar', 'editar', 'excluir'],
  disciplinas: ['visualizar', 'criar', 'editar', 'excluir'],
  matriculas: ['visualizar', 'criar', 'editar', 'excluir'],
  aulas: ['visualizar', 'criar', 'editar', 'excluir'],
  presenca: ['visualizar', 'registrar', 'editar'],
  provas: ['visualizar', 'criar', 'editar', 'excluir', 'aplicar', 'corrigir'],
  notas: ['visualizar', 'lancar', 'editar'],
  boletins: ['visualizar', 'editar'],
  avaliacoes: ['visualizar', 'gerenciar', 'notificar'],
  relatorios: ['visualizar', 'exportar'],
  financeiro: ['visualizar', 'criar', 'editar', 'excluir', 'conciliar', 'exportar'],
  configuracoes: ['visualizar', 'editar'],
} as const

type ModuleKey = keyof typeof MODULE_ACTIONS

export type PermissionKey = {
  [M in ModuleKey]: `${M}.${(typeof MODULE_ACTIONS)[M][number]}`
}[ModuleKey]

export const PERMISSIONS: Array<{
  key: PermissionKey
  module: ModuleKey
  action: string
}> = (Object.entries(MODULE_ACTIONS) as Array<
  [ModuleKey, readonly string[]]
>).flatMap(([module, actions]) => actions.map((action) => ({
  key: `${module}.${action}` as PermissionKey,
  module,
  action,
})))

const academicCrud = [
  'alunos',
  'professores',
  'igrejas',
  'cursos',
  'turmas',
  'disciplinas',
  'matriculas',
  'aulas',
] as const

const crudPermissions = (modules: readonly ModuleKey[]): PermissionKey[] => (
  modules.flatMap((module) => MODULE_ACTIONS[module]
    .filter((action) => ['visualizar', 'criar', 'editar', 'excluir'].includes(action))
    .map((action) => `${module}.${action}` as PermissionKey))
)

export const DEFAULT_ROLE_PERMISSIONS: Record<string, readonly PermissionKey[]> = {
  SUPER_ADMIN: [],
  COORDENADOR: [
    'dashboard.visualizar',
    ...crudPermissions(academicCrud),
    'presenca.visualizar',
    'presenca.registrar',
    'presenca.editar',
    'provas.visualizar',
    'provas.criar',
    'provas.editar',
    'provas.excluir',
    'provas.aplicar',
    'provas.corrigir',
    'notas.visualizar',
    'notas.lancar',
    'notas.editar',
    'boletins.visualizar',
    'boletins.editar',
    'avaliacoes.visualizar',
    'avaliacoes.gerenciar',
    'avaliacoes.notificar',
    'relatorios.visualizar',
    'relatorios.exportar',
  ],
  SECRETARIA: [
    'dashboard.visualizar',
    'alunos.visualizar',
    'alunos.criar',
    'alunos.editar',
    'igrejas.visualizar',
    'igrejas.criar',
    'igrejas.editar',
    'turmas.visualizar',
    'turmas.criar',
    'turmas.editar',
    'matriculas.visualizar',
    'matriculas.criar',
    'matriculas.editar',
    'professores.visualizar',
    'cursos.visualizar',
    'disciplinas.visualizar',
    'aulas.visualizar',
    'presenca.visualizar',
    'provas.visualizar',
    'notas.visualizar',
    'boletins.visualizar',
    'avaliacoes.visualizar',
    'relatorios.visualizar',
  ],
  FINANCEIRO: [
    'dashboard.visualizar',
    'alunos.visualizar',
    'matriculas.visualizar',
    'financeiro.visualizar',
    'financeiro.criar',
    'financeiro.editar',
    'financeiro.excluir',
    'financeiro.conciliar',
    'financeiro.exportar',
  ],
  PROFESSOR: [
    'dashboard.visualizar',
    'turmas.visualizar',
    'disciplinas.visualizar',
    'aulas.visualizar',
    'presenca.visualizar',
    'presenca.registrar',
    'presenca.editar',
    'provas.visualizar',
    'provas.criar',
    'provas.editar',
    'provas.excluir',
    'provas.aplicar',
    'provas.corrigir',
    'notas.visualizar',
    'notas.lancar',
    'notas.editar',
    'boletins.visualizar',
    'avaliacoes.visualizar',
    'relatorios.visualizar',
    'relatorios.exportar',
  ],
  MONITOR: [
    'dashboard.visualizar',
    'turmas.visualizar',
    'aulas.visualizar',
    'presenca.visualizar',
    'presenca.registrar',
    'presenca.editar',
  ],
}

const INITIAL_ROLES = [
  { key: 'SUPER_ADMIN', name: 'Super Administrador', description: 'Acesso irrestrito ao sistema.', protected: true },
  { key: 'COORDENADOR', name: 'Coordenador', description: 'Gestão acadêmica e operacional.', protected: false },
  { key: 'SECRETARIA', name: 'Secretaria', description: 'Atendimento e apoio acadêmico.', protected: false },
  { key: 'FINANCEIRO', name: 'Financeiro', description: 'Gestão financeira.', protected: false },
  { key: 'PROFESSOR', name: 'Professor', description: 'Atuação acadêmica nas turmas vinculadas.', protected: false },
  { key: 'MONITOR', name: 'Monitor', description: 'Apoio às turmas vinculadas.', protected: false },
] as const

type AuthorizationPrisma = {
  permission: {
    upsert(args: unknown): Promise<{ id: string; key: string }>
  }
  role: {
    upsert(args: unknown): Promise<{ id: string; key: string }>
  }
  rolePermission: {
    deleteMany(args: unknown): Promise<unknown>
    createMany(args: unknown): Promise<unknown>
  }
  user: {
    upsert(args: unknown): Promise<unknown>
  }
}

export async function syncAuthorizationSeed(prisma: AuthorizationPrisma): Promise<void> {
  const permissions = await Promise.all(PERMISSIONS.map(async (permission) => {
    const record = await prisma.permission.upsert({
      where: { key: permission.key },
      update: { module: permission.module, action: permission.action },
      create: permission,
    })

    return [record.key as PermissionKey, record.id] as const
  }))
  const permissionIds = new Map<PermissionKey, string>(permissions)

  const roles = await Promise.all(INITIAL_ROLES.map(async (role) => {
    const record = await prisma.role.upsert({
      where: { key: role.key },
      update: { name: role.name, description: role.description, active: true, protected: role.protected },
      create: { ...role, active: true },
    })

    return [record.key, record.id] as const
  }))
  const roleIds = new Map(roles)

  for (const [roleKey, grants] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const roleId = roleIds.get(roleKey)
    if (!roleId) throw new Error(`Missing seeded role: ${roleKey}`)

    await prisma.rolePermission.deleteMany({ where: { roleId } })
    if (grants.length > 0) {
      await prisma.rolePermission.createMany({
        data: grants.map((permissionKey) => {
          const permissionId = permissionIds.get(permissionKey)
          if (!permissionId) throw new Error(`Missing seeded permission: ${permissionKey}`)

          return { roleId, permissionId }
        }),
      })
    }
  }

  const masterPassword = process.env.SUPER_ADMIN_INITIAL_PASSWORD ?? 'admin123'
  const password = await bcrypt.hash(masterPassword, 12)
  const adminRoleId = roleIds.get('SUPER_ADMIN')
  if (!adminRoleId) throw new Error('Missing seeded role: SUPER_ADMIN')

  await prisma.user.upsert({
    where: { email: 'admin@huios.com.br' },
    update: {
      password,
      role: 'SUPER_ADMIN',
      adminRoleId,
      active: true,
      mustChangePassword: false,
    },
    create: {
      name: 'Super Administrador',
      email: 'admin@huios.com.br',
      password,
      role: 'SUPER_ADMIN',
      adminRoleId,
      active: true,
      mustChangePassword: false,
    },
  })
}
