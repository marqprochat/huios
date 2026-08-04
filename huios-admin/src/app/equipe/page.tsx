import Link from 'next/link'

import { requirePageAccess } from '@/lib/permissions/page-guard'
import { canAccess } from '@/lib/permissions/server'

import { DeleteButton } from './DeleteButton'
import { ResetPasswordButton } from './ResetPasswordButton'
import { fetchTeamMembers } from './actions'

export default async function EquipePage() {
  const context = await requirePageAccess('equipe.visualizar')
  const members = await fetchTeamMembers()
  const canCreate = canAccess(context, 'equipe.criar')
  const canEdit = canAccess(context, 'equipe.editar')
  const canDelete = canAccess(context, 'equipe.excluir')

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-4 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Equipe
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            Gerencie os membros da equipe do Huios Avancado.
          </p>
        </div>
        {canCreate && (
          <Link
            href="/equipe/novo"
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary/90"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Novo Membro
          </Link>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/50">
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Nome
                </th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Contato
                </th>
                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Funcao
                </th>
                {(canEdit || canDelete) && (
                  <th className="p-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Acoes
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800/50">
              {members.length === 0 ? (
                <tr>
                  <td
                    colSpan={canEdit || canDelete ? 4 : 3}
                    className="border-b border-slate-200 bg-slate-50/50 p-8 text-center text-slate-500 dark:border-slate-800 dark:text-slate-400"
                  >
                    Nenhum membro encontrado.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr
                    key={member.id}
                    className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                  >
                    <td className="p-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {member.name}
                      </div>
                      {member.studentId && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-primary">
                          <span className="material-symbols-outlined text-[12px]">
                            person
                          </span>
                          Aluno Cadastrado
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">
                      <div>{member.email}</div>
                      <div className="text-xs">{member.phone || '-'}</div>
                    </td>
                    <td className="p-4">
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {member.user?.adminRole?.name || 'Sem funcao'}
                      </span>
                      {(!member.active || member.user?.active === false) && (
                        <span className="ml-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-500">
                          Inativa
                        </span>
                      )}
                      {member.area && (
                        <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">
                          {member.area}
                        </div>
                      )}
                      {member.courseClassAssignments.length > 0 && (
                        <div className="mt-1 text-[10px] text-slate-500">
                          {member.courseClassAssignments.length} turma(s) atribuida(s)
                        </div>
                      )}
                    </td>
                    {(canEdit || canDelete) && (
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canEdit && (
                            <Link
                              href={`/equipe/${member.id}/editar`}
                              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-primary dark:hover:bg-primary/10"
                              title="Editar"
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                edit
                              </span>
                            </Link>
                          )}
                          {canEdit && member.user && (
                            <ResetPasswordButton id={member.id} name={member.name} />
                          )}
                          {canDelete && <DeleteButton id={member.id} />}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
