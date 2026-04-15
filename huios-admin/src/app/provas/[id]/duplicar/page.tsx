import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { duplicateExam } from '../../actions';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DuplicarProvaPage({ params }: Props) {
  const { id } = await params;
  
  const prova = await prisma.exam.findUnique({
    where: { id },
    include: {
      discipline: {
        include: {
          courseClasses: true
        }
      }
    }
  });

  if (!prova) {
    notFound();
  }

  const formatDateForInput = (date: Date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  async function handleDuplicate(formData: FormData) {
    'use server';
    const title = formData.get('title') as string;
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    
    await duplicateExam(id, startDate, endDate, title);
    redirect('/provas');
  }

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/provas" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Duplicar Prova</h2>
          <p className="text-slate-500 dark:text-slate-400">Criar uma cópia de: {prova.title}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 lg:p-8">
        <form action={handleDuplicate} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Novo Título *</label>
              <input
                type="text"
                name="title"
                defaultValue={`${prova.title} (Cópia)`}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nova Data e Hora de Início *</label>
                <input
                  type="datetime-local"
                  name="startDate"
                  required
                  defaultValue={formatDateForInput(prova.startDate)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nova Data e Hora de Término *</label>
                <input
                  type="datetime-local"
                  name="endDate"
                  required
                  defaultValue={formatDateForInput(prova.endDate)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <p className="text-sm text-blue-700 dark:text-blue-400">
                A nova prova será criada como <strong>Rascunho</strong> e incluirá todas as questões e alternativas da prova original.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-200 dark:border-slate-800">
            <Link href="/provas" className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
              Cancelar
            </Link>
            <button type="submit" className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20">
              Confirmar Duplicação
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
