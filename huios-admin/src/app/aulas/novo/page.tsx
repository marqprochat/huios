import Link from 'next/link';
import prisma from '@/lib/prisma';
import { createLessonWithRedirect } from '../actions';
import { brToday } from '@/lib/date-utils';

export default async function NovaAulaPage({ searchParams }: { searchParams: Promise<{ disciplineId?: string }> }) {
  const p = await searchParams;
  const preSelectedDisciplineId = p.disciplineId;

  const disciplinas = await prisma.discipline.findMany({
    include: {
      courseClasses: {
        select: { name: true }
      }
    },
    orderBy: { name: 'asc' }
  });

  // Dia de hoje em Brasília, no formato YYYY-MM-DD
  const today = brToday();

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/aulas" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Nova Aula</h2>
          <p className="text-slate-500 dark:text-slate-400">Registre um novo encontro da disciplina</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 lg:p-8">
        <form action={createLessonWithRedirect} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">
                Disciplinas / Turmas *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
                {disciplinas.map((d) => (
                  <label key={d.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors group">
                    <div className="relative flex items-center mt-0.5">
                      <input
                        type="checkbox"
                        name="disciplineIds"
                        value={d.id}
                        defaultChecked={preSelectedDisciplineId === d.id}
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-slate-300 dark:border-slate-600 checked:bg-primary checked:border-primary transition-all"
                      />
                      <span className="material-symbols-outlined absolute text-white scale-0 peer-checked:scale-100 transition-transform pointer-events-none text-base font-bold">
                        check
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors line-clamp-1">
                        {d.name}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {d.courseClasses.map(cc => cc.name).join(', ')}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">Selecione uma ou mais disciplinas para vincular a esta aula.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="date" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Data *
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  required
                  defaultValue={today}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label htmlFor="startTime" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Horário Início
                </label>
                <input
                  type="time"
                  id="startTime"
                  name="startTime"
                  defaultValue="19:30"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label htmlFor="endTime" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Horário Término
                </label>
                <input
                  type="time"
                  id="endTime"
                  name="endTime"
                  defaultValue="22:10"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
            </div>

      <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Localização para Check-in</h3>

        <div className="space-y-4 opacity-50 pointer-events-none">
          <p className="text-sm text-slate-500 mb-4">
            Configuração de localização movida para a página de Configurações &gt; Localização.
          </p>
        </div>
      </div>

            <div>
              <label htmlFor="description" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Observações
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                placeholder="Observações opcionais sobre a aula"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-200 dark:border-slate-800">
            <Link
              href="/aulas"
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
            >
              Criar Aula
            </button>
          </div>
        </form>
      </div>
      
    </div>
  );
}
