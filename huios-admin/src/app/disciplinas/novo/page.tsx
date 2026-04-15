import { createDiscipline } from '../actions';
import Link from 'next/link';
import prisma from '@/lib/prisma';

export default async function NovaDisciplinaPage() {
    const turmas = await prisma.courseClass.findMany({
        include: { course: true },
        orderBy: [{ course: { name: 'asc' } }, { name: 'asc' }]
    });

    const professores = await prisma.teacher.findMany({
        orderBy: { name: 'asc' }
    });

    const currentYear = new Date().getFullYear();

    return (
        <div className="max-w-[800px] mx-auto p-4 lg:p-8 space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/disciplinas" className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Nova Disciplina</h2>
                    <p className="text-slate-500 dark:text-slate-400">Cadastre uma nova disciplina e vincule às turmas.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8">
                <form action={createDiscipline} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 md:col-span-2">
                            <label htmlFor="name" className="text-sm font-bold text-slate-700 dark:text-slate-300">Nome da Disciplina <span className="text-red-500">*</span></label>
                            <input type="text" id="name" name="name" required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="Ex: Introdução à Teologia" />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label htmlFor="description" className="text-sm font-bold text-slate-700 dark:text-slate-300">Descrição</label>
                            <textarea id="description" name="description" rows={3} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="Ementa ou detalhes..."></textarea>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Turmas (Curso) <span className="text-red-500">*</span></label>
                            <p className="text-xs text-slate-400">Selecione uma ou mais turmas para esta disciplina.</p>
                            <div className="space-y-2 max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800">
                                {turmas.map(turma => (
                                    <label key={turma.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            name="courseClassIds"
                                            value={turma.id}
                                            className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/50"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">
                                            {turma.name} — <span className="text-primary font-medium">{turma.course.name}</span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="teacherId" className="text-sm font-bold text-slate-700 dark:text-slate-300">Professor</label>
                            <select id="teacherId" name="teacherId" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white">
                                <option value="">Sem professor ainda</option>
                                {professores.map(professor => (
                                    <option key={professor.id} value={professor.id}>{professor.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="workload" className="text-sm font-bold text-slate-700 dark:text-slate-300">Carga Horária (horas)</label>
                            <input type="number" id="workload" name="workload" min="1" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="Ex: 40" />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="year" className="text-sm font-bold text-slate-700 dark:text-slate-300">Ano Letivo</label>
                            <input type="number" id="year" name="year" min="2020" max="2099" defaultValue={currentYear} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="Ex: 2026" />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                        <Link href="/disciplinas" className="px-6 py-3 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            Cancelar
                        </Link>
                        <button type="submit" className="bg-primary text-white px-8 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">save</span>
                            Salvar Disciplina
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
