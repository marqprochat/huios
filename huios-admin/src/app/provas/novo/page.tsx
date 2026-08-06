import Link from 'next/link';
import prisma from '@/lib/prisma';
import { groupDisciplineStudents } from '@/lib/exam-participants';
import ExamForm from '../ExamForm';
import { createExam } from '../actions';

export default async function NovaProvaPage() {
  const disciplines = await prisma.discipline.findMany({
    include: {
      courseClasses: {
        include: {
          course: { select: { name: true } },
          enrollments: {
            where: { status: 'CURSANDO' },
            select: { status: true, student: { select: { id: true, name: true } } },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const options = disciplines.map(discipline => ({
    id: discipline.id,
    name: discipline.name,
    groups: groupDisciplineStudents(discipline),
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 lg:p-8">
      <div className="flex items-center gap-4">
        <Link href="/provas" className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Nova Prova</h2>
          <p className="text-slate-500 dark:text-slate-400">Crie uma prova e escolha os alunos participantes</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 lg:p-8">
        <ExamForm disciplines={options} action={createExam} />
      </div>
    </div>
  );
}
