import Link from 'next/link';
import prisma from '@/lib/prisma';
import { DeleteButton } from './DeleteButton';

export default async function DisciplinasPage() {
    const disciplinas = await prisma.discipline.findMany({
        include: { 
            courseClass: { include: { course: true } }, 
            teacher: true 
        },
        orderBy: { name: 'asc' }
    });

    return (
        <div className="max-w-[1600px] mx-auto p-4 lg:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Disciplinas</h2>
                    <p className="text-slate-500 dark:text-slate-400">Gerencie as disciplinas das turmas</p>
                </div>
                <Link href="/disciplinas/novo" className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined text-sm">add</span>
                    Nova Disciplina
                </Link>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Nome da Disciplina</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Turma / Curso</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Professor</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Carga Horária</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {disciplinas.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Nenhuma disciplina cadastrada.</td>
                                </tr>
                            ) : null}
                            {disciplinas.map(disciplina => (
                                <tr key={disciplina.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4 font-medium">{disciplina.name}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-primary">{disciplina.courseClass.name}</div>
                                        <div className="text-xs text-slate-500">{disciplina.courseClass.course.name}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                        {disciplina.teacher?.name || <span className="text-slate-400 italic">Não atribuído</span>}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {disciplina.workload ? `${disciplina.workload}h` : '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Link href={`/disciplinas/${disciplina.id}/editar`} className="text-slate-400 hover:text-primary transition-colors" title="Editar Disciplina">
                                                <span className="material-symbols-outlined text-xl">edit</span>
                                            </Link>
                                            <DeleteButton id={disciplina.id} />
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
