import {
  createRole,
  duplicateRole,
  listRoles,
  setRoleActive,
  updateRole,
} from './actions'
import { RoleList } from './RoleList'

export const dynamic = 'force-dynamic'

export default async function FuncoesPage() {
  const roles = await listRoles()

  return (
    <RoleList
      roles={roles}
      createRoleAction={createRole}
      updateRoleAction={updateRole}
      duplicateRoleAction={duplicateRole}
      setRoleActiveAction={setRoleActive}
    />
  )
}
