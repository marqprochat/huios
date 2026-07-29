import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PERMISSIONS } from '@/lib/permissions/catalog'
import { getRole, replaceRolePermissions } from '../actions'
import { PermissionMatrix } from './PermissionMatrix'

export const dynamic = 'force-dynamic'

export default async function RolePermissionsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const role = await getRole(id)
  if (!role) notFound()

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 lg:p-8">
      <header className="flex items-start gap-3">
        <Link
          href="/funcoes"
          aria-label="Voltar para funções"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-primary dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <span className="material-symbols-outlined" aria-hidden>
            arrow_back
          </span>
        </Link>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {role.name}
            </h1>
            {role.protected && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                <span
                  className="material-symbols-outlined text-xs"
                  aria-hidden
                >
                  lock
                </span>
                Protegida
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {role.protected
              ? 'A função Super Admin possui acesso irrestrito e é somente leitura.'
              : 'Selecione as capacidades concedidas a esta função.'}
          </p>
        </div>
      </header>

      <PermissionMatrix
        roleId={role.id}
        protectedRole={role.protected}
        permissions={PERMISSIONS}
        initialKeys={role.permissions.map(({ permission }) => permission.key)}
        replaceRolePermissionsAction={replaceRolePermissions}
      />
    </div>
  )
}
