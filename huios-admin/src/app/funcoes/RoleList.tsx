'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Can } from '@/app/components/AccessContext'
import { useToast } from '@/app/components/Toast/useToast'
import type {
  RoleActionResult,
  RoleInput,
  RoleListItem,
} from './actions'

type RoleDialog =
  | { kind: 'create' }
  | { kind: 'edit'; role: RoleListItem }
  | { kind: 'duplicate'; role: RoleListItem }

type Props = {
  roles: RoleListItem[]
  createRoleAction(input: RoleInput): Promise<RoleActionResult>
  updateRoleAction(id: string, input: RoleInput): Promise<RoleActionResult>
  duplicateRoleAction(id: string, name: string): Promise<RoleActionResult>
  setRoleActiveAction(id: string, active: boolean): Promise<RoleActionResult>
}

const iconButton =
  'inline-flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-primary disabled:cursor-not-allowed disabled:opacity-35 dark:text-slate-400 dark:hover:bg-slate-800'

export function RoleList({
  roles,
  createRoleAction,
  updateRoleAction,
  duplicateRoleAction,
  setRoleActiveAction,
}: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [dialog, setDialog] = useState<RoleDialog | null>(null)
  const [isPending, startTransition] = useTransition()

  function finish(result: RoleActionResult, successMessage: string) {
    if (!result.success) {
      toast(
        'error',
        'Nao foi possivel concluir',
        result.error ?? 'Tente novamente.',
      )
      return
    }

    setDialog(null)
    toast('success', successMessage)
    router.refresh()
  }

  function submitRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!dialog) return

    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') ?? '')
    const description = String(form.get('description') ?? '')

    startTransition(async () => {
      if (dialog.kind === 'create') {
        finish(
          await createRoleAction({ name, description }),
          'Funcao criada com sucesso.',
        )
        return
      }

      if (dialog.kind === 'edit') {
        finish(
          await updateRoleAction(dialog.role.id, { name, description }),
          'Funcao atualizada com sucesso.',
        )
        return
      }

      finish(
        await duplicateRoleAction(dialog.role.id, name),
        'Funcao duplicada com sucesso.',
      )
    })
  }

  function toggleRole(role: RoleListItem) {
    if (role.protected) return

    const nextActive = !role.active
    const verb = nextActive ? 'ativar' : 'desativar'
    if (!window.confirm(`Deseja ${verb} a funcao "${role.name}"?`)) return

    startTransition(async () => {
      finish(
        await setRoleActiveAction(role.id, nextActive),
        `Funcao ${nextActive ? 'ativada' : 'desativada'} com sucesso.`,
      )
    })
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm font-bold text-primary">
            <span className="material-symbols-outlined text-lg" aria-hidden>
              admin_panel_settings
            </span>
            Acesso administrativo
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Funcoes e permissoes
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Defina o acesso da equipe por funcao.
          </p>
        </div>
        <Can permission="funcoes.criar">
          <button
            type="button"
            onClick={() => setDialog({ kind: 'create' })}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-opacity hover:opacity-90"
          >
            <span className="material-symbols-outlined text-lg" aria-hidden>
              add
            </span>
            Nova funcao
          </button>
        </Can>
      </header>

      <section
        aria-label="Funcoes administrativas"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      >
        {roles.length === 0 ? (
          <div className="px-6 py-14 text-center text-slate-400">
            <span
              className="material-symbols-outlined mb-2 text-5xl"
              aria-hidden
            >
              badge
            </span>
            <p className="font-semibold">Nenhuma funcao cadastrada.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {roles.map((role) => (
              <article
                key={role.id}
                className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-black text-slate-900 dark:text-white">
                      {role.name}
                    </h2>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-black uppercase tracking-wide ${
                        role.active
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {role.active ? 'Ativa' : 'Inativa'}
                    </span>
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
                    {role.description || 'Sem descricao.'}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-slate-400">
                    {role._count.users}{' '}
                    {role._count.users === 1
                      ? 'usuario atribuido'
                      : 'usuarios atribuidos'}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <Can permission="funcoes.visualizar">
                    <Link
                      href={`/funcoes/${role.id}`}
                      aria-label={
                        role.protected
                          ? `Ver permissoes de ${role.name}`
                          : `Editar permissoes de ${role.name}`
                      }
                      title={
                        role.protected
                          ? 'Ver permissoes'
                          : 'Editar permissoes'
                      }
                      className={iconButton}
                    >
                      <span
                        className="material-symbols-outlined text-xl"
                        aria-hidden
                      >
                        checklist
                      </span>
                    </Link>
                  </Can>
                  <Can permission="funcoes.editar">
                    <button
                      type="button"
                      onClick={() => setDialog({ kind: 'edit', role })}
                      disabled={role.protected || isPending}
                      aria-label={`Editar funcao ${role.name}`}
                      title={role.protected ? 'Funcao protegida' : 'Editar funcao'}
                      className={iconButton}
                    >
                      <span
                        className="material-symbols-outlined text-xl"
                        aria-hidden
                      >
                        edit
                      </span>
                    </button>
                  </Can>
                  <Can permission="funcoes.criar">
                    <button
                      type="button"
                      onClick={() => setDialog({ kind: 'duplicate', role })}
                      disabled={role.protected || isPending}
                      aria-label={`Duplicar funcao ${role.name}`}
                      title={role.protected ? 'Funcao protegida' : 'Duplicar funcao'}
                      className={iconButton}
                    >
                      <span
                        className="material-symbols-outlined text-xl"
                        aria-hidden
                      >
                        content_copy
                      </span>
                    </button>
                  </Can>
                  <Can permission="funcoes.excluir">
                    <button
                      type="button"
                      onClick={() => toggleRole(role)}
                      disabled={role.protected || isPending}
                      aria-label={`${role.active ? 'Desativar' : 'Ativar'} funcao ${role.name}`}
                      title={
                        role.protected
                          ? 'Funcao protegida'
                          : role.active
                            ? 'Desativar funcao'
                            : 'Ativar funcao'
                      }
                      className={iconButton}
                    >
                      <span
                        className="material-symbols-outlined text-xl"
                        aria-hidden
                      >
                        {role.active ? 'toggle_on' : 'toggle_off'}
                      </span>
                    </button>
                  </Can>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {dialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isPending) {
              setDialog(null)
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-dialog-title"
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="role-dialog-title"
                  className="text-lg font-black text-slate-900 dark:text-white"
                >
                  {dialog.kind === 'create'
                    ? 'Nova funcao'
                    : dialog.kind === 'edit'
                      ? 'Editar funcao'
                      : 'Duplicar funcao'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {dialog.kind === 'duplicate'
                    ? `Crie uma copia das permissoes de ${dialog.role.name}.`
                    : 'Informe o nome e a descricao exibidos para a equipe.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDialog(null)}
                disabled={isPending}
                aria-label="Fechar"
                className={iconButton}
              >
                <span className="material-symbols-outlined" aria-hidden>
                  close
                </span>
              </button>
            </div>

            <form onSubmit={submitRole} className="space-y-4">
              <div>
                <label
                  htmlFor="role-name"
                  className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300"
                >
                  Nome
                </label>
                <input
                  id="role-name"
                  name="name"
                  required
                  autoFocus
                  maxLength={80}
                  defaultValue={
                    dialog.kind === 'create'
                      ? ''
                      : dialog.kind === 'edit'
                        ? dialog.role.name
                        : `${dialog.role.name} - Copia`
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              {dialog.kind !== 'duplicate' && (
                <div>
                  <label
                    htmlFor="role-description"
                    className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300"
                  >
                    Descricao
                  </label>
                  <textarea
                    id="role-description"
                    name="description"
                    rows={3}
                    maxLength={500}
                    defaultValue={
                      dialog.kind === 'edit'
                        ? dialog.role.description ?? ''
                        : ''
                    }
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDialog(null)}
                  disabled={isPending}
                  className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {isPending && (
                    <span
                      className="material-symbols-outlined animate-spin text-lg"
                      aria-hidden
                    >
                      progress_activity
                    </span>
                  )}
                  {dialog.kind === 'duplicate' ? 'Duplicar' : 'Salvar'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
