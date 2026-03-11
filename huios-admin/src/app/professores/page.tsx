import Link from 'next/link';
import prisma from '@/lib/prisma';
import { DeleteButton } from './DeleteButton';

export default async function ProfessoresPage() {
    const professores = await prisma.teacher.findMany({
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div className="max-w-[1600px] mx-auto p-4 lg:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Professores</h2>
                    <p className="text-slate-500 dark:text-slate-400">Gerencie o corpo docente do seminário</p>
                </div>
                <Link href="/professores/novo" className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined text-sm">assignment_add</span>
                    Novo Professor
                </Link>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Docente</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Email</th>

                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {professores.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">Nenhum professor cadastrado.</td>
                                </tr>
                            ) : null}
                            {professores.map((prof: any) => (
                                <tr key={prof.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-xs font-bold">
                                                {prof.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span className="text-sm font-medium">{prof.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm">{prof.email}</td>

                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Link href={`/professores/${prof.id}/editar`} className="text-slate-400 hover:text-primary transition-colors" title="Editar Professor">
                                                <span className="material-symbols-outlined text-xl">edit</span>
                                            </Link>
                                            <DeleteButton id={prof.id} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
