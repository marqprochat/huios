import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { groupDisciplineStudents } from '@/lib/exam-participants';
import { toBRDateTimeInput } from '@/lib/date-utils';
import ExamForm from '../../ExamForm';
import { deleteExam, publishExam, unpublishExam, updateExam } from '../../actions';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarProvaPage({ params }: Props) {
  const { id } = await params;
  const [exam, disciplines] = await Promise.all([
    prisma.exam.findUnique({
      where: { id },
      include: {
        participants: { select: { studentId: true } },
        submissions: { select: { studentId: true } },
        _count: { select: { questions: true } },
      },
    }),
    prisma.discipline.findMany({
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
    }),
  ]);

  if (!exam) notFound();

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
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Editar Prova</h2>
          <p className="text-slate-500 dark:text-slate-400">{exam.title}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 lg:p-8">
        <ExamForm
          disciplines={options}
          action={updateExam.bind(null, id)}
          initialExam={{
            title: exam.title,
            description: exam.description ?? '',
            disciplineId: exam.disciplineId,
            startDate: toBRDateTimeInput(exam.startDate),
            endDate: toBRDateTimeInput(exam.endDate),
            duration: exam.duration,
          }}
          initialParticipantIds={exam.participants.map(participant => participant.studentId)}
          lockedParticipantIds={exam.submissions.map(submission => submission.studentId)}
        />

        <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-6 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">{exam._count.questions} questões · {exam.isPublished ? 'Publicada' : 'Rascunho'}</span>
            {!exam.isPublished ? (
              <form action={publishExam.bind(null, id)}>
                <button type="submit" className="rounded-lg bg-green-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-green-600">Publicar Prova</button>
              </form>
            ) : (
              <form action={unpublishExam.bind(null, id)}>
                <button type="submit" className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-yellow-600">Despublicar</button>
              </form>
            )}
          </div>
          <form action={async () => {
            'use server';
            await deleteExam(id);
          }}>
            <button type="submit" className="px-4 py-2 text-sm font-bold text-red-500 transition-colors hover:text-red-600">Excluir Prova</button>
          </form>
        </div>
      </div>
    </div>
  );
}
