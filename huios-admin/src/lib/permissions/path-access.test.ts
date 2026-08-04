import assert from 'node:assert/strict'
import test from 'node:test'

import {
  PATH_PERMISSIONS,
  resolvePathRequirement,
} from './path-access'

const UUID = '11111111-1111-4111-8111-111111111111'

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
      resolvePathRequirement(`/${moduleName}/${UUID}/editar`),
      { kind: 'permission', permission: `${moduleName}.editar` },
    )
  }
})

test('academic special paths use their exact mutation permission', () => {
  assert.deepEqual(resolvePathRequirement('/aulas/novo'), {
    kind: 'permission',
    permission: 'aulas.criar',
  })
  assert.deepEqual(resolvePathRequirement(`/aulas/${UUID}/editar`), {
    kind: 'permission',
    permission: 'aulas.editar',
  })
  assert.deepEqual(resolvePathRequirement(`/aulas/${UUID}/presenca`), {
    kind: 'permission',
    permission: 'presenca.registrar',
  })
  assert.deepEqual(resolvePathRequirement('/provas/novo'), {
    kind: 'permission',
    permission: 'provas.criar',
  })
  assert.deepEqual(resolvePathRequirement(`/provas/${UUID}/duplicar`), {
    kind: 'permission',
    permission: 'provas.criar',
  })
  assert.deepEqual(resolvePathRequirement(`/provas/${UUID}/questoes`), {
    kind: 'permission',
    permission: 'provas.editar',
  })
})

test('team and role management follow explicit action permissions', () => {
  for (const path of [
    '/equipe',
    '/equipe/novo',
    `/equipe/${UUID}/editar`,
    '/funcoes',
    `/funcoes/${UUID}`,
  ]) {
    const expected =
      path.startsWith('/equipe')
        ? path === '/equipe'
          ? { kind: 'permission', permission: 'equipe.visualizar' }
          : path === '/equipe/novo'
            ? { kind: 'permission', permission: 'equipe.criar' }
            : { kind: 'permission', permission: 'equipe.editar' }
        : path === '/funcoes'
          ? { kind: 'permission', permission: 'funcoes.visualizar' }
          : { kind: 'permission', permission: 'funcoes.visualizar' }

    assert.deepEqual(resolvePathRequirement(path), expected)
  }
})

test('allows explicitly declared detail and family child routes', () => {
  assert.deepEqual(resolvePathRequirement(`/alunos/${UUID}`), {
    kind: 'permission',
    permission: 'alunos.visualizar',
  })
  assert.deepEqual(resolvePathRequirement(`/boletins/${UUID}`), {
    kind: 'permission',
    permission: 'boletins.visualizar',
  })
  assert.deepEqual(resolvePathRequirement('/relatorios/presenca'), {
    kind: 'permission',
    permission: 'relatorios.visualizar',
  })
  assert.deepEqual(resolvePathRequirement('/financeiro/contas-a-pagar'), {
    kind: 'permission',
    permission: 'financeiro.visualizar',
  })
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
  for (const path of [
    '/administracao-futura',
    '/alunos/importar',
    '/alunos/novo/operacao-futura',
    `/disciplinas/${UUID}/editar/operacao-futura`,
    '/relatorios/futuro',
    '/financeiro/importar',
    '/equipe/importar',
    '/funcoes/importar',
    '/login/operacao-futura',
    '/trocar-senha/operacao-futura',
    '/acesso-negado/operacao-futura',
  ]) {
    assert.deepEqual(
      resolvePathRequirement(path),
      { kind: 'deny', reason: 'unknown' },
      path,
    )
  }
})
