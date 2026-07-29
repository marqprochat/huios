'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { useToast } from '@/app/components/Toast/useToast'
import type { RoleActionResult } from '../actions'

type PermissionItem = {
  key: string
  module: string
  action: string
}

type Props = {
  roleId: string
  protectedRole: boolean
  permissions: PermissionItem[]
  initialKeys: string[]
  replaceRolePermissionsAction(
    id: string,
    keys: string[],
  ): Promise<RoleActionResult>
}

const labelOverrides: Record<string, string> = {
  lancar: 'Lançar',
  gerenciar: 'Gerenciar',
  notificar: 'Notificar',
  conciliar: 'Conciliar',
  registrar: 'Registrar',
  aplicar: 'Aplicar',
  corrigir: 'Corrigir',
}

function title(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/^\p{L}/u, (character) => character.toLocaleUpperCase('pt-BR'))
}

function actionLabel(action: string): string {
  return labelOverrides[action] ?? title(action)
}

export function PermissionMatrix({
  roleId,
  protectedRole,
  permissions,
  initialKeys,
  replaceRolePermissionsAction,
}: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [selected, setSelected] = useState(() => new Set(initialKeys))
  const [isPending, startTransition] = useTransition()
  const groups = useMemo(() => {
    const result = new Map<string, PermissionItem[]>()
    for (const permission of permissions) {
      const modulePermissions = result.get(permission.module) ?? []
      modulePermissions.push(permission)
      result.set(permission.module, modulePermissions)
    }
    return [...result.entries()]
  }, [permissions])

  function setPermission(key: string, checked: boolean) {
    if (protectedRole) return
    setSelected((current) => {
      const next = new Set(current)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }

  function setModule(modulePermissions: PermissionItem[], checked: boolean) {
    if (protectedRole) return
    setSelected((current) => {
      const next = new Set(current)
      for (const permission of modulePermissions) {
        if (checked) next.add(permission.key)
        else next.delete(permission.key)
      }
      return next
    })
  }

  function save() {
    if (protectedRole) return
    startTransition(async () => {
      const result = await replaceRolePermissionsAction(
        roleId,
        [...selected],
      )
      if (!result.success) {
        toast(
          'error',
          'Não foi possível salvar',
          result.error ?? 'Tente novamente.',
        )
        return
      }

      toast('success', 'Permissões salvas com sucesso.')
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      {protectedRole && (
        <div
          role="status"
          className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
        >
          <span className="material-symbols-outlined" aria-hidden>
            info
          </span>
          <p className="text-sm">
            O Super Admin tem acesso automático a todos os módulos. Sua matriz
            não pode ser alterada.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {groups.map(([moduleName, modulePermissions]) => (
          <section
            key={moduleName}
            aria-labelledby={`module-${moduleName}`}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          >
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/40">
              <div>
                <h2
                  id={`module-${moduleName}`}
                  className="font-black text-slate-900 dark:text-white"
                >
                  {title(moduleName)}
                </h2>
                <p className="text-xs text-slate-500">
                  {modulePermissions.length}{' '}
                  {modulePermissions.length === 1
                    ? 'capacidade'
                    : 'capacidades'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModule(modulePermissions, true)}
                  disabled={protectedRole || isPending}
                  aria-label={`Marcar todas as permissões do módulo ${title(moduleName)}`}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Marcar módulo
                </button>
                <button
                  type="button"
                  onClick={() => setModule(modulePermissions, false)}
                  disabled={protectedRole || isPending}
                  aria-label={`Limpar todas as permissões do módulo ${title(moduleName)}`}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-200/70 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-700"
                >
                  Limpar módulo
                </button>
              </div>
            </header>

            <div className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-3 dark:bg-slate-800">
              {modulePermissions.map((permission) => (
                <label
                  key={permission.key}
                  className={`flex items-start gap-3 bg-white px-5 py-4 dark:bg-slate-900 ${
                    protectedRole
                      ? 'cursor-not-allowed opacity-65'
                      : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={
                      protectedRole ? true : selected.has(permission.key)
                    }
                    disabled={protectedRole || isPending}
                    onChange={(event) => {
                      setPermission(permission.key, event.target.checked)
                    }}
                    aria-label={`${actionLabel(permission.action)} em ${title(moduleName)}`}
                    className="mt-0.5 size-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <span>
                    <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                      {actionLabel(permission.action)}
                    </span>
                    <span className="mt-0.5 block font-mono text-[11px] text-slate-400">
                      {permission.key}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>

      {!protectedRole && (
        <div className="sticky bottom-4 flex justify-end rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <span
              className={`material-symbols-outlined text-lg ${
                isPending ? 'animate-spin' : ''
              }`}
              aria-hidden
            >
              {isPending ? 'progress_activity' : 'save'}
            </span>
            {isPending ? 'Salvando...' : 'Salvar permissões'}
          </button>
        </div>
      )}
    </div>
  )
}
