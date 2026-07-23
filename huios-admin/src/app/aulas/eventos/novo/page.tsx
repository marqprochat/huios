import Link from 'next/link';
import prisma from '@/lib/prisma';
import { createEventWithRedirect } from '../actions';
import NovoEventoForm from './NovoEventoForm';

export default async function NovoEventoPage() {
  const courseClasses = await prisma.courseClass.findMany({
    select: { id: true, name: true, course: { select: { name: true } } },
    orderBy: { name: 'asc' }
  });

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/aulas" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Novo Evento</h2>
          <p className="text-slate-500 dark:text-slate-400">Cadastre um evento institucional (formatura, conferência, etc.)</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 lg:p-8">
        <NovoEventoForm
          courseClasses={courseClasses.map(cc => ({ id: cc.id, name: cc.name, courseName: cc.course.name }))}
          today={today}
          action={createEventWithRedirect}
        />
      </div>
    </div>
  );
}
