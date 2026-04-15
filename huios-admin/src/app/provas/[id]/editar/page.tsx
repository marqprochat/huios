import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { updateExam, publishExam, unpublishExam, duplicateExam, deleteExam } from '../../actions';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarProvaPage({ params }: Props) {
  const { id } = await params;
  
  const prova = await prisma.exam.findUnique({
    where: { id },
    include: {
      discipline: {
        include: {
          courseClasses: true
        }
      },
      _count: {
        select: { questions: true }
      }
    }
  });

  if (!prova) {
    notFound();
  }

  const disciplinas = await prisma.discipline.findMany({
    include: {
      courseClasses: {
        select: { name: true }
      }
    },
    orderBy: { name: 'asc' }
  });

  const formatDateForInput = (date: Date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/provas" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Editar Prova</h2>
          <p className="text-slate-500 dark:text-slate-400">{prova.title}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 lg:p-8">
        <form action={updateExam.bind(null, id)} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Título da Prova *</label>
              <input
                type="text"
                name="title"
                defaultValue={prova.title}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Descrição</label>
              <textarea
                name="description"
                defaultValue={prova.description || ''}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Disciplina *</label>
              <select
                name="disciplineId"
                required
                defaultValue={prova.disciplineId}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              >
                {disciplinas.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} - {d.courseClasses.map(cc => cc.name).join(', ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Data e Hora de Início *</label>
                <input
                  type="datetime-local"
                  name="startDate"
                  required
                  defaultValue={formatDateForInput(prova.startDate)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Data e Hora de Término *</label>
                <input
                  type="datetime-local"
                  name="endDate"
                  required
                  defaultValue={formatDateForInput(prova.endDate)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Duração (minutos)</label>
              <input
                type="number"
                name="duration"
                min="1"
                defaultValue={prova.duration || ''}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">
                {prova._count.questions} questões • {prova.isPublished ? 'Publicada' : 'Rascunho'}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/provas" className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
                Cancelar
              </Link>
              <button type="submit" className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20">
                Salvar Alterações
              </button>
            </div>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!prova.isPublished ? (
              <form action={async () => {
                'use server';
                await publishExam(id);
              }}>
                <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-600 transition-colors">
                  Publicar Prova
                </button>
              </form>
            ) : (
              <form action={async () => {
                'use server';
                await unpublishExam(id);
              }}>
                <button type="submit" className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-yellow-600 transition-colors">
                  Despublicar
                </button>
              </form>
            )}
          </div>
          <form action={async () => {
            'use server';
            await deleteExam(id);
          }}>
            <button type="submit" className="text-red-500 hover:text-red-600 text-sm font-bold px-4 py-2 transition-colors">
              Excluir Prova
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
