import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSIONS,
} from './catalog'

test('catalog permission keys are unique and follow the module.action format', () => {
  const keys = PERMISSIONS.map(({ key }) => key)

  assert.equal(new Set(keys).size, keys.length)
  assert.ok(PERMISSIONS.every(({ key, module, action }) => (
    key === `${module}.${action}` && /^[a-z]+\.[a-z]+$/.test(key)
  )))
})

test('every default role grant exists in the catalog', () => {
  const catalogKeys = new Set(PERMISSIONS.map(({ key }) => key))

  for (const permissions of Object.values(DEFAULT_ROLE_PERMISSIONS)) {
    for (const permission of permissions) {
      assert.ok(catalogKeys.has(permission), `missing permission: ${permission}`)
    }
  }
})

test('super admin has no configurable permission grants', () => {
  assert.deepEqual(DEFAULT_ROLE_PERMISSIONS.SUPER_ADMIN, [])
})

test('default configurable roles cannot manage team members or roles', () => {
  for (const [role, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    if (role === 'SUPER_ADMIN') continue

    assert.ok(!permissions.some((permission) => permission.startsWith('equipe.')))
    assert.ok(!permissions.some((permission) => permission.startsWith('funcoes.')))
  }
})
