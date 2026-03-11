import { updateCourseClass } from '../../actions';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';

export default async function EditarTurmaPage({ params }: { params: Promise<{ id: string }> }) {
    const p = await params;
    const turma = await prisma.courseClass.findUnique({
        where: { id: p.id }
    });

    if (!turma) {
        notFound();
    }

    const cursos = await prisma.course.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { name: 'asc' }
    });

    // Format dates for input type="date"
    const startDateFormatted = turma.startDate ? turma.startDate.toISOString().split('T')[0] : '';
    const endDateFormatted = turma.endDate ? turma.endDate.toISOString().split('T')[0] : '';

    const updateTurmaWithId = updateCourseClass.bind(null, turma.id);

    return (
        <div className="max-w-[800px] mx-auto p-4 lg:p-8 space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/turmas" className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Editar Turma</h2>
                    <p className="text-slate-500 dark:text-slate-400">Atualize os dados da turma.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8">
                <form action={updateTurmaWithId} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 md:col-span-2">
                            <label htmlFor="name" className="text-sm font-bold text-slate-700 dark:text-slate-300">Nome da Turma <span className="text-red-500">*</span></label>
                            <input type="text" id="name" name="name" defaultValue={turma.name} required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="Ex: Turma A - 2026" />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label htmlFor="courseId" className="text-sm font-bold text-slate-700 dark:text-slate-300">Curso <span className="text-red-500">*</span></label>
                            <select id="courseId" name="courseId" defaultValue={turma.courseId} required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white">
                                <option value="">Selecione um curso...</option>
                                {cursos.map(curso => (
                                    <option key={curso.id} value={curso.id}>{curso.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="startDate" className="text-sm font-bold text-slate-700 dark:text-slate-300">Data de Início</label>
                            <input type="date" id="startDate" name="startDate" defaultValue={startDateFormatted} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="endDate" className="text-sm font-bold text-slate-700 dark:text-slate-300">Data de Término</label>
                            <input type="date" id="endDate" name="endDate" defaultValue={endDateFormatted} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label htmlFor="duration" className="text-sm font-bold text-slate-700 dark:text-slate-300">Tempo de Duração</label>
                            <input type="text" id="duration" name="duration" defaultValue={turma.duration || ''} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="Ex: 2 anos" />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                        <Link href="/turmas" className="px-6 py-3 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            Cancelar
                        </Link>
                        <button type="submit" className="bg-primary text-white px-8 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">save</span>
                            Atualizar Turma
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
