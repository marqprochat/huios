import Link from 'next/link';
import prisma from '@/lib/prisma';
import { DeleteButton } from './DeleteButton';

export default async function CursosPage() {
    const cursos = await prisma.course.findMany({
        orderBy: { name: 'asc' }
    });

    return (
        <div className="max-w-[1600px] mx-auto p-4 lg:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Cursos</h2>
                    <p className="text-slate-500 dark:text-slate-400">Gerencie os cursos do seminário</p>
                </div>
                <Link href="/cursos/novo" className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined text-sm">add</span>
                    Novo Curso
                </Link>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 w-16">Imagem</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Nome</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Descrição</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {cursos.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Nenhum curso cadastrado.</td>
                                </tr>
                            ) : null}
                            {cursos.map(curso => (
                                <tr key={curso.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4">
                                        {curso.imageUrl ? (
                                            <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={curso.imageUrl} alt={curso.name} className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                                                <span className="material-symbols-outlined text-slate-400">image</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-medium">{curso.name}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{curso.description || '-'}</td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                            curso.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                            {curso.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Link href={`/cursos/${curso.id}/editar`} className="text-slate-400 hover:text-primary transition-colors" title="Editar Curso">
                                                <span className="material-symbols-outlined text-xl">edit</span>
                                            </Link>
                                            <DeleteButton id={curso.id} />
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
