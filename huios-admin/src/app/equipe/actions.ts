'use server'

import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/permissions/server'
import { revalidatePath } from 'next/cache'

type Result = { success: true } | { success: false; error: string }

const clean = (value: FormDataEntryValue | null) => String(value ?? '').trim()

function classIds(formData: FormData): string[] {
  return [...new Set(formData.getAll('courseClassIds').map(String).filter(Boolean))]
}

async function ensureRole(roleId: string) {
  const role = await prisma.role.findFirst({
    where: { id: roleId, active: true },
    select: { id: true, key: true, protected: true },
  })
  if (!role) throw new Error('A função selecionada está inativa ou não existe.')
  return role
}

async function audit(
  tx: typeof prisma,
  actorId: string,
  action: string,
  entityId: string,
  changes: Record<string, unknown>,
) {
  await tx.auditLog.create({
    data: { actorId, action, entity: 'TeamMember', entityId, changes: changes as never },
  })
}

export async function fetchTeamMembers() {
  await requireSuperAdmin()
  return prisma.teamMember.findMany({
    orderBy: { name: 'asc' },
    include: {
      student: { select: { name: true } },
      user: { select: { active: true, adminRole: { select: { name: true, key: true } } } },
      courseClassAssignments: { where: { active: true }, select: { courseClassId: true } },
    },
  })
}

export async function fetchStudentsForTeam() {
  await requireSuperAdmin()
  return prisma.student.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, userId: true, name: true, email: true, phone: true, cpf: true, birthDate: true, maritalStatus: true, address: true },
  })
}

export async function fetchAssignableRoles() {
  await requireSuperAdmin()
  return prisma.role.findMany({ where: { active: true, protected: false }, orderBy: { name: 'asc' }, select: { id: true, name: true, key: true } })
}

export async function fetchCourseClassesForTeam() {
  await requireSuperAdmin()
  return prisma.courseClass.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, course: { select: { name: true } } } })
}

export async function createTeamMember(formData: FormData): Promise<Result> {
  const actor = await requireSuperAdmin()
  const name = clean(formData.get('name'))
  const email = clean(formData.get('email')).toLowerCase()
  const roleId = clean(formData.get('roleId'))
  const temporaryPassword = clean(formData.get('temporaryPassword'))
  const studentId = clean(formData.get('studentId')) || null
  if (!name || !email || !roleId || temporaryPassword.length < 8) return { success: false, error: 'Informe nome, e-mail, função e uma senha temporária de ao menos 8 caracteres.' }

  try {
    await prisma.$transaction(async (tx) => {
      const role = await tx.role.findFirst({ where: { id: roleId, active: true }, select: { id: true, protected: true } })
      if (!role || role.protected) throw new Error('A função selecionada não pode ser atribuída por este cadastro.')
      const student = studentId ? await tx.student.findUnique({ where: { id: studentId }, select: { id: true, userId: true, email: true } }) : null
      if (studentId && !student) throw new Error('Aluno não encontrado.')
      if (student && student.email.toLowerCase() !== email) throw new Error('O e-mail deve ser o mesmo do aluno selecionado.')
      let user = student?.userId ? await tx.user.findUnique({ where: { id: student.userId } }) : await tx.user.findUnique({ where: { email } })
      if (user && student?.userId !== user.id) throw new Error('Este e-mail já pertence a outra conta. Selecione o aluno correspondente.')
      if (!user) user = await tx.user.create({ data: { name, email, password: await bcrypt.hash(temporaryPassword, 12), role: 'MONITOR', active: true, mustChangePassword: true } })
      if (student && !student.userId) await tx.student.update({ where: { id: student.id }, data: { userId: user.id } })
      const member = await tx.teamMember.create({ data: {
        name, email, phone: clean(formData.get('phone')) || null, cpf: clean(formData.get('cpf')) || null,
        birthDate: clean(formData.get('birthDate')) ? new Date(clean(formData.get('birthDate'))) : null,
        maritalStatus: clean(formData.get('maritalStatus')) || null, address: clean(formData.get('address')) || null,
        area: clean(formData.get('area')) || null, studentId, userId: user.id, active: true,
        courseClassAssignments: { create: classIds(formData).map(courseClassId => ({ courseClassId })) },
      } })
      await tx.user.update({ where: { id: user.id }, data: { name, email, adminRoleId: role.id, active: true, mustChangePassword: true } })
      await audit(tx as typeof prisma, actor.userId, 'TEAM_MEMBER_CREATED', member.id, { name, email, roleId, studentId, courseClassIds: classIds(formData) })
    })
    revalidatePath('/equipe')
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Não foi possível criar o membro.' }
  }
}

export async function updateTeamMember(id: string, formData: FormData): Promise<Result> {
  const actor = await requireSuperAdmin()
  const name = clean(formData.get('name')); const email = clean(formData.get('email')).toLowerCase(); const roleId = clean(formData.get('roleId'))
  if (!name || !email || !roleId) return { success: false, error: 'Informe nome, e-mail e função.' }
  try {
    await prisma.$transaction(async (tx) => {
      const member = await tx.teamMember.findUnique({ where: { id }, include: { user: true } })
      if (!member?.user) throw new Error('Membro sem conta de acesso.')
      if (member.userId === actor.userId && clean(formData.get('active')) === 'false') throw new Error('Você não pode desativar a própria conta.')
      const role = await tx.role.findFirst({ where: { id: roleId, active: true }, select: { id: true, protected: true, key: true } })
      if (!role) throw new Error('A função selecionada está inativa ou não existe.')
      const becomingNonSuper = member.user.adminRoleId && member.user.adminRoleId !== role.id
      if (becomingNonSuper && member.user.adminRoleId) {
        const current = await tx.user.count({ where: { active: true, adminRole: { key: 'SUPER_ADMIN', protected: true } } })
        const wasSuper = await tx.role.findUnique({ where: { id: member.user.adminRoleId }, select: { key: true, protected: true } })
        if (wasSuper?.key === 'SUPER_ADMIN' && wasSuper.protected && current <= 1) throw new Error('Não é possível remover o último Super Admin ativo.')
      }
      await tx.teamMemberCourseClass.deleteMany({ where: { teamMemberId: id } })
      await tx.teamMember.update({ where: { id }, data: { name, email, phone: clean(formData.get('phone')) || null, cpf: clean(formData.get('cpf')) || null, area: clean(formData.get('area')) || null, birthDate: clean(formData.get('birthDate')) ? new Date(clean(formData.get('birthDate'))) : null, maritalStatus: clean(formData.get('maritalStatus')) || null, address: clean(formData.get('address')) || null, active: clean(formData.get('active')) !== 'false', courseClassAssignments: { create: classIds(formData).map(courseClassId => ({ courseClassId })) } } })
      await tx.user.update({ where: { id: member.user.id }, data: { name, email, adminRoleId: role.id, active: clean(formData.get('active')) !== 'false' } })
      await audit(tx as typeof prisma, actor.userId, 'TEAM_MEMBER_UPDATED', id, { name, email, roleId, active: clean(formData.get('active')) !== 'false', courseClassIds: classIds(formData) })
    })
    revalidatePath('/equipe'); revalidatePath(`/equipe/${id}/editar`)
    return { success: true }
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Não foi possível atualizar o membro.' } }
}

export async function resetTeamMemberPassword(id: string, temporaryPassword: string): Promise<Result> {
  const actor = await requireSuperAdmin()
  if (temporaryPassword.length < 8) return { success: false, error: 'A senha temporária deve ter ao menos 8 caracteres.' }
  const member = await prisma.teamMember.findUnique({ where: { id }, select: { userId: true } })
  if (!member?.userId) return { success: false, error: 'Membro sem conta de acesso.' }
  await prisma.$transaction(async tx => { await tx.user.update({ where: { id: member.userId! }, data: { password: await bcrypt.hash(temporaryPassword, 12), mustChangePassword: true } }); await audit(tx as typeof prisma, actor.userId, 'TEAM_MEMBER_PASSWORD_RESET', id, { mustChangePassword: true }) })
  return { success: true }
}

export async function deleteTeamMember(id: string): Promise<Result> {
  const actor = await requireSuperAdmin()
  const member = await prisma.teamMember.findUnique({ where: { id }, include: { user: { include: { adminRole: true } } } })
  if (!member?.userId) return { success: false, error: 'Membro não encontrado.' }
  if (member.userId === actor.userId) return { success: false, error: 'Você não pode desativar a própria conta.' }
  if (member.user?.adminRole?.key === 'SUPER_ADMIN' && member.user.adminRole.protected) {
    const total = await prisma.user.count({ where: { active: true, adminRole: { key: 'SUPER_ADMIN', protected: true } } })
    if (total <= 1) return { success: false, error: 'Não é possível desativar o último Super Admin ativo.' }
  }
  await prisma.$transaction(async tx => {
    await tx.teamMember.update({ where: { id }, data: { active: false } })
    await tx.user.update({ where: { id: member.userId! }, data: { active: false } })
    await audit(tx as typeof prisma, actor.userId, 'TEAM_MEMBER_DEACTIVATED', id, { active: false })
  })
  revalidatePath('/equipe')
  return { success: true }
}
