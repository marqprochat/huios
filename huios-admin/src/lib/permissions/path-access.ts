import type { PermissionKey } from './catalog'

export type PathRequirement =
  | { kind: 'public' }
  | { kind: 'portal' }
  | { kind: 'password-change' }
  | { kind: 'access-denied' }
  | { kind: 'permission'; permission: PermissionKey }
  | { kind: 'super-admin' }
  | { kind: 'deny'; reason: 'unknown' }

export interface PathPermission {
  pattern: string
  requirement:
    | { kind: 'permission'; permission: PermissionKey }
    | { kind: 'super-admin' }
}

const pathPermissions: PathPermission[] = [
  { pattern: '/disciplinas/:id/editar', requirement: { kind: 'permission', permission: 'disciplinas.editar' } },
  { pattern: '/professores/:id/editar', requirement: { kind: 'permission', permission: 'professores.editar' } },
  { pattern: '/matriculas/:id/editar', requirement: { kind: 'permission', permission: 'matriculas.editar' } },
  { pattern: '/financeiro/:id/editar', requirement: { kind: 'permission', permission: 'financeiro.editar' } },
  { pattern: '/configuracoes/editar', requirement: { kind: 'permission', permission: 'configuracoes.editar' } },
  { pattern: '/provas/:id/questoes', requirement: { kind: 'permission', permission: 'provas.editar' } },
  { pattern: '/provas/:id/duplicar', requirement: { kind: 'permission', permission: 'provas.criar' } },
  { pattern: '/aulas/:id/presenca', requirement: { kind: 'permission', permission: 'presenca.registrar' } },
  { pattern: '/financeiro/relatorios', requirement: { kind: 'permission', permission: 'financeiro.exportar' } },
  { pattern: '/relatorios/exportar', requirement: { kind: 'permission', permission: 'relatorios.exportar' } },
  { pattern: '/avaliacoes/gerenciar', requirement: { kind: 'permission', permission: 'avaliacoes.gerenciar' } },
  { pattern: '/boletins/:id/editar', requirement: { kind: 'permission', permission: 'boletins.editar' } },
  { pattern: '/disciplinas/novo', requirement: { kind: 'permission', permission: 'disciplinas.criar' } },
  { pattern: '/professores/novo', requirement: { kind: 'permission', permission: 'professores.criar' } },
  { pattern: '/matriculas/novo', requirement: { kind: 'permission', permission: 'matriculas.criar' } },
  { pattern: '/financeiro/novo', requirement: { kind: 'permission', permission: 'financeiro.criar' } },
  { pattern: '/alunos/:id/editar', requirement: { kind: 'permission', permission: 'alunos.editar' } },
  { pattern: '/igrejas/:id/editar', requirement: { kind: 'permission', permission: 'igrejas.editar' } },
  { pattern: '/cursos/:id/editar', requirement: { kind: 'permission', permission: 'cursos.editar' } },
  { pattern: '/turmas/:id/editar', requirement: { kind: 'permission', permission: 'turmas.editar' } },
  { pattern: '/provas/:id/editar', requirement: { kind: 'permission', permission: 'provas.editar' } },
  { pattern: '/aulas/:id/editar', requirement: { kind: 'permission', permission: 'aulas.editar' } },
  { pattern: '/cupons/:id/editar', requirement: { kind: 'permission', permission: 'financeiro.editar' } },
  { pattern: '/financeiro/precos-cursos', requirement: { kind: 'permission', permission: 'financeiro.visualizar' } },
  { pattern: '/financeiro/contas-a-receber', requirement: { kind: 'permission', permission: 'financeiro.visualizar' } },
  { pattern: '/financeiro/contas-a-pagar', requirement: { kind: 'permission', permission: 'financeiro.visualizar' } },
  { pattern: '/financeiro/categorias', requirement: { kind: 'permission', permission: 'financeiro.visualizar' } },
  { pattern: '/alunos/novo', requirement: { kind: 'permission', permission: 'alunos.criar' } },
  { pattern: '/igrejas/novo', requirement: { kind: 'permission', permission: 'igrejas.criar' } },
  { pattern: '/cursos/novo', requirement: { kind: 'permission', permission: 'cursos.criar' } },
  { pattern: '/turmas/novo', requirement: { kind: 'permission', permission: 'turmas.criar' } },
  { pattern: '/provas/novo', requirement: { kind: 'permission', permission: 'provas.criar' } },
  { pattern: '/aulas/eventos/novo', requirement: { kind: 'permission', permission: 'aulas.criar' } },
  { pattern: '/aulas/lote', requirement: { kind: 'permission', permission: 'aulas.criar' } },
  { pattern: '/aulas/novo', requirement: { kind: 'permission', permission: 'aulas.criar' } },
  { pattern: '/cupons/novo', requirement: { kind: 'permission', permission: 'financeiro.criar' } },
  { pattern: '/equipe', requirement: { kind: 'super-admin' } },
  { pattern: '/funcoes', requirement: { kind: 'super-admin' } },
  { pattern: '/professores', requirement: { kind: 'permission', permission: 'professores.visualizar' } },
  { pattern: '/disciplinas', requirement: { kind: 'permission', permission: 'disciplinas.visualizar' } },
  { pattern: '/matriculas', requirement: { kind: 'permission', permission: 'matriculas.visualizar' } },
  { pattern: '/configuracoes', requirement: { kind: 'permission', permission: 'configuracoes.visualizar' } },
  { pattern: '/avaliacoes', requirement: { kind: 'permission', permission: 'avaliacoes.visualizar' } },
  { pattern: '/relatorios', requirement: { kind: 'permission', permission: 'relatorios.visualizar' } },
  { pattern: '/financeiro', requirement: { kind: 'permission', permission: 'financeiro.visualizar' } },
  { pattern: '/pendencias', requirement: { kind: 'permission', permission: 'presenca.visualizar' } },
  { pattern: '/boletins', requirement: { kind: 'permission', permission: 'boletins.visualizar' } },
  { pattern: '/igrejas', requirement: { kind: 'permission', permission: 'igrejas.visualizar' } },
  { pattern: '/alunos', requirement: { kind: 'permission', permission: 'alunos.visualizar' } },
  { pattern: '/cursos', requirement: { kind: 'permission', permission: 'cursos.visualizar' } },
  { pattern: '/turmas', requirement: { kind: 'permission', permission: 'turmas.visualizar' } },
  { pattern: '/provas', requirement: { kind: 'permission', permission: 'provas.visualizar' } },
  { pattern: '/aulas', requirement: { kind: 'permission', permission: 'aulas.visualizar' } },
  { pattern: '/cupons', requirement: { kind: 'permission', permission: 'financeiro.visualizar' } },
  { pattern: '/', requirement: { kind: 'permission', permission: 'dashboard.visualizar' } },
]

export const PATH_PERMISSIONS: readonly PathPermission[] = Object.freeze(
  [...pathPermissions].sort(
    (left, right) => right.pattern.length - left.pattern.length,
  ),
)

function normalizePath(pathname: string): string {
  const pathOnly = pathname.split(/[?#]/, 1)[0] || '/'
  if (pathOnly === '/') return '/'
  return `/${pathOnly.split('/').filter(Boolean).join('/')}`
}

function hasPathPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

function matchesPattern(pathname: string, pattern: string): boolean {
  if (pattern === '/') return pathname === '/'

  const pathSegments = pathname.slice(1).split('/')
  const patternSegments = pattern.slice(1).split('/')
  if (pathSegments.length < patternSegments.length) return false

  return patternSegments.every((segment, index) => (
    segment.startsWith(':') || segment === pathSegments[index]
  ))
}

export function resolvePathRequirement(pathname: string): PathRequirement {
  const normalized = normalizePath(pathname)

  if (hasPathPrefix(normalized, '/trocar-senha')) {
    return { kind: 'password-change' }
  }
  if (hasPathPrefix(normalized, '/acesso-negado')) {
    return { kind: 'access-denied' }
  }
  if (
    hasPathPrefix(normalized, '/login') ||
    hasPathPrefix(normalized, '/portal/login') ||
    hasPathPrefix(normalized, '/matricula')
  ) {
    return { kind: 'public' }
  }
  if (hasPathPrefix(normalized, '/portal')) {
    return { kind: 'portal' }
  }

  const match = PATH_PERMISSIONS.find(({ pattern }) => (
    matchesPattern(normalized, pattern)
  ))

  return match?.requirement ?? { kind: 'deny', reason: 'unknown' }
}
