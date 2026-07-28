import assert from 'node:assert/strict'
import test from 'node:test'

import {
  PATH_PERMISSIONS,
  resolvePathRequirement,
} from './path-access'

test('specific create and edit routes take precedence over module display routes', () => {
  const modules = [
    'alunos',
    'professores',
    'igrejas',
    'cursos',
    'turmas',
    'disciplinas',
    'matriculas',
  ] as const

  for (const moduleName of modules) {
    assert.deepEqual(
      resolvePathRequirement(`/${moduleName}`),
      { kind: 'permission', permission: `${moduleName}.visualizar` },
    )
    assert.deepEqual(
      resolvePathRequirement(`/${moduleName}/novo`),
      { kind: 'permission', permission: `${moduleName}.criar` },
    )
    assert.deepEqual(
      resolvePathRequirement(`/${moduleName}/record-1/editar`),
      { kind: 'permission', permission: `${moduleName}.editar` },
    )
  }
})

test('academic special paths use their exact mutation permission', () => {
  assert.deepEqual(resolvePathRequirement('/aulas/novo'), {
    kind: 'permission',
    permission: 'aulas.criar',
  })
  assert.deepEqual(resolvePathRequirement('/aulas/aula-1/editar'), {
    kind: 'permission',
    permission: 'aulas.editar',
  })
  assert.deepEqual(resolvePathRequirement('/aulas/aula-1/presenca'), {
    kind: 'permission',
    permission: 'presenca.registrar',
  })
  assert.deepEqual(resolvePathRequirement('/provas/novo'), {
    kind: 'permission',
    permission: 'provas.criar',
  })
  assert.deepEqual(resolvePathRequirement('/provas/prova-1/duplicar'), {
    kind: 'permission',
    permission: 'provas.criar',
  })
  assert.deepEqual(resolvePathRequirement('/provas/prova-1/questoes'), {
    kind: 'permission',
    permission: 'provas.editar',
  })
})

test('team and role management are Super Admin-only for all child paths', () => {
  for (const path of [
    '/equipe',
    '/equipe/novo',
    '/equipe/member-1/editar',
    '/funcoes',
    '/funcoes/nova',
    '/funcoes/role-1/editar',
  ]) {
    assert.deepEqual(resolvePathRequirement(path), { kind: 'super-admin' })
  }
})

test('covers dashboard, operational, report, financial and settings routes', () => {
  const expectations = new Map([
    ['/', 'dashboard.visualizar'],
    ['/igrejas', 'igrejas.visualizar'],
    ['/provas', 'provas.visualizar'],
    ['/aulas', 'aulas.visualizar'],
    ['/boletins', 'boletins.visualizar'],
    ['/avaliacoes', 'avaliacoes.visualizar'],
    ['/relatorios/alunos', 'relatorios.visualizar'],
    ['/financeiro', 'financeiro.visualizar'],
    ['/financeiro/categorias', 'financeiro.visualizar'],
    ['/financeiro/relatorios', 'financeiro.exportar'],
    ['/cupons', 'financeiro.visualizar'],
    ['/pendencias', 'presenca.visualizar'],
    ['/configuracoes', 'configuracoes.visualizar'],
  ])

  for (const [path, permission] of expectations) {
    assert.deepEqual(resolvePathRequirement(path), {
      kind: 'permission',
      permission,
    })
  }
})

test('the exported route map is ordered longest-prefix-first', () => {
  const lengths = PATH_PERMISSIONS.map(({ pattern }) => pattern.length)
  assert.deepEqual(lengths, [...lengths].sort((left, right) => right - left))
})

test('distinguishes public, portal, password-change and access-denied paths', () => {
  assert.deepEqual(resolvePathRequirement('/login'), { kind: 'public' })
  assert.deepEqual(resolvePathRequirement('/portal/login'), { kind: 'public' })
  assert.deepEqual(resolvePathRequirement('/matricula/turma/class-1'), {
    kind: 'public',
  })
  assert.deepEqual(resolvePathRequirement('/portal/aulas'), { kind: 'portal' })
  assert.deepEqual(resolvePathRequirement('/trocar-senha'), {
    kind: 'password-change',
  })
  assert.deepEqual(resolvePathRequirement('/acesso-negado'), {
    kind: 'access-denied',
  })
})

test('does not confuse public enrollment with admin enrollments', () => {
  assert.deepEqual(resolvePathRequirement('/matriculas'), {
    kind: 'permission',
    permission: 'matriculas.visualizar',
  })
})

test('unknown administrative paths deny by default', () => {
  assert.deepEqual(resolvePathRequirement('/administracao-futura'), {
    kind: 'deny',
    reason: 'unknown',
  })
})
