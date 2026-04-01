import Link from 'next/link';
import prisma from '@/lib/prisma';
import { createExam } from '../actions';

export default async function NovaProvaPage() {
  const disciplinas = await prisma.discipline.findMany({
    include: {
      courseClass: {
        select: {
          name: true
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/provas"
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Nova Prova</h2>
          <p className="text-slate-500 dark:text-slate-400">Crie uma nova prova para os alunos</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 lg:p-8">
        <form action={createExam} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Título da Prova *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="Ex: Prova 1 - Teologia Sistemática"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Descrição
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                placeholder="Descrição opcional da prova"
              />
            </div>

            <div>
              <label htmlFor="disciplineId" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Disciplina *
              </label>
              <select
                id="disciplineId"
                name="disciplineId"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              >
                <option value="">Selecione uma disciplina</option>
                {disciplinas.map((disciplina) => (
                  <option key={disciplina.id} value={disciplina.id}>
                    {disciplina.name} - {disciplina.courseClass.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Data e Hora de Início *
                </label>
                <input
                  type="datetime-local"
                  id="startDate"
                  name="startDate"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label htmlFor="endDate" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Data e Hora de Término *
                </label>
                <input
                  type="datetime-local"
                  id="endDate"
                  name="endDate"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="duration" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Duração (minutos)
              </label>
              <input
                type="number"
                id="duration"
                name="duration"
                min="1"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="Ex: 60 (opcional)"
              />
              <p className="text-xs text-slate-500 mt-1">Deixe em branco para não limitar o tempo</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-200 dark:border-slate-800">
            <Link
              href="/provas"
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
            >
              Criar Prova
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
