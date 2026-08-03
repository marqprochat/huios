import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createProfessorWithDependencies,
  deleteProfessorWithDependencies,
  updateProfessorWithDependencies,
} from './actions'

function formData(): FormData {
  const data = new FormData()
  data.set('name', 'Professor Teste')
  data.set('email', 'professor@example.com')
  return data
}

function deniedDependencies() {
  return {
    requirePermission: async () => {
      throw new Error('Acesso negado.')
    },
    createTeacher: async () => {
      throw new Error('não deveria criar')
    },
    updateTeacher: async () => {
      throw new Error('não deveria editar')
    },
    deleteTeacher: async () => {
      throw new Error('não deveria excluir')
    },
    revalidatePath: () => undefined,
    redirect: () => {
      throw new Error('não deveria redirecionar')
    },
  }
}

test('visualizar não permite criar professor', async () => {
  await assert.rejects(
    createProfessorWithDependencies(formData(), deniedDependencies()),
    /Acesso negado/,
  )
})

test('visualizar não permite editar professor', async () => {
  await assert.rejects(
    updateProfessorWithDependencies('teacher-1', formData(), deniedDependencies()),
    /Acesso negado/,
  )
})

test('visualizar não permite excluir professor', async () => {
  await assert.rejects(
    deleteProfessorWithDependencies('teacher-1', deniedDependencies()),
    /Acesso negado/,
  )
})
