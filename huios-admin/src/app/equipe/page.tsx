import Link from 'next/link';
import { fetchTeamMembers } from './actions';
import { DeleteButton } from './DeleteButton';

export default async function EquipePage() {
    const members = await fetchTeamMembers();

    return (
        <div className="max-w-[1200px] mx-auto p-4 lg:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Equipe</h2>
                    <p className="text-slate-500 dark:text-slate-400">Gerencie os membros da equipe do Huios Avançado.</p>
                </div>
                <Link href="/equipe/novo" className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Novo Membro
                </Link>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nome</th>
                                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contato</th>
                                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Função</th>
                                <th className="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-sm">
                            {members.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500 dark:text-slate-400 bg-slate-50/50 border-b border-slate-200">
                                        Nenhum membro encontrado.
                                    </td>
                                </tr>
                            ) : (
                                members.map((member) => (
                                    <tr key={member.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4">
                                            <div className="font-semibold text-slate-900 dark:text-white">{member.name}</div>
                                            {member.studentId && (
                                                <div className="text-xs text-primary mt-1 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[12px]">person</span>
                                                    Aluno Cadastrado
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-slate-600 dark:text-slate-400">
                                            <div>{member.email}</div>
                                            <div className="text-xs">{member.phone || '-'}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                member.role === 'LIDER_DE_TURMA' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                member.role === 'VOLUNTARIO' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                            }`}>
                                                {member.role === 'LIDER_DE_TURMA' ? 'Líder de Turma' : 
                                                 member.role === 'VOLUNTARIO' ? 'Voluntário' : 'Monitor'}
                                            </span>
                                            {member.area && (
                                                <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">{member.area}</div>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link href={`/equipe/${member.id}/editar`} className="p-2 text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-primary/10 rounded-lg transition-colors" title="Editar">
                                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                                </Link>
                                                <DeleteButton id={member.id} />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
