import Link from 'next/link';
import prisma from '@/lib/prisma';

export default async function AulasPage() {
  const aulas = await prisma.lesson.findMany({
    include: {
      discipline: {
        include: {
          courseClass: true
        }
      },
      _count: {
        select: {
          attendances: true
        }
      }
    },
    orderBy: { date: 'desc' }
  });

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date | null) => {
    if (!date) return '--:--';
    return new Date(date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Aulas</h2>
          <p className="text-slate-500 dark:text-slate-400">Gerencie os encontros e presenças</p>
        </div>
        <Link
          href="/aulas/novo"
          className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Nova Aula
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Data</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Horário</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Disciplina</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Local</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Check-in</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {aulas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Nenhuma aula cadastrada.
                  </td>
                </tr>
              ) : null}
              {aulas.map((aula) => (
                <tr key={aula.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium">{formatDate(aula.date)}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    {formatTime(aula.startTime)} - {formatTime(aula.endTime)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-primary">{aula.discipline.name}</div>
                    <div className="text-xs text-slate-500">{aula.discipline.courseClass.name}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    {aula.locationName || 'Não definido'}
                    {aula.latitude && aula.longitude && (
                      <div className="text-xs text-slate-400 mt-1">
                        Raio: {aula.radiusMeters}m
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="font-bold">{aula._count.attendances}</span> alunos
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/aulas/${aula.id}/presenca`}
                        className="text-slate-400 hover:text-primary transition-colors"
                        title="Lançar Presença"
                      >
                        <span className="material-symbols-outlined text-xl">checklist</span>
                      </Link>
                      <Link
                        href={`/aulas/${aula.id}/editar`}
                        className="text-slate-400 hover:text-primary transition-colors"
                        title="Editar Aula"
                      >
                        <span className="material-symbols-outlined text-xl">edit</span>
                      </Link>
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
