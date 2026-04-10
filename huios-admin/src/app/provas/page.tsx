import Link from 'next/link';
import prisma from '@/lib/prisma';

export default async function ProvasPage() {
  const provas = await prisma.exam.findMany({
    include: {
      discipline: {
        include: {
          courseClass: true
        }
      },
      _count: {
        select: {
          questions: true,
          submissions: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const formatDate = (date: Date) => {
    // Ajusta para GMT-3 para exibição no servidor (já que o servidor costuma ser UTC)
    const d = new Date(date);
    // Não mexemos no objeto date original, apenas na exibição
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
  };

  const getStatusBadge = (prova: any) => {
    const now = new Date();
    const start = new Date(prova.startDate);
    const end = new Date(prova.endDate);

    if (!prova.isPublished) {
      return <span className="px-2 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Rascunho</span>;
    }
    
    // As comparações funcionam corretamente se ambos forem Date objects baseados em UTC ou no mesmo fuso
    if (now < start) {
      return <span className="px-2 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Agendada</span>;
    }
    if (now >= start && now <= end) {
      return <span className="px-2 py-1 text-xs font-bold rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Em Andamento</span>;
    }
    return <span className="px-2 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">Encerrada</span>;
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Provas</h2>
          <p className="text-slate-500 dark:text-slate-400">Gerencie as provas das disciplinas</p>
        </div>
        <Link
          href="/provas/novo"
          className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Nova Prova
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Prova</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Disciplina</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Período</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Questões</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {provas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Nenhuma prova cadastrada.
                  </td>
                </tr>
              ) : null}
              {provas.map((prova) => (
                <tr key={prova.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium">{prova.title}</div>
                    {prova.description && (
                      <div className="text-sm text-slate-500 truncate max-w-[200px]">{prova.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-primary">{prova.discipline.name}</div>
                    <div className="text-xs text-slate-500">{prova.discipline.courseClass.name}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    <div>{formatDate(prova.startDate)}</div>
                    <div className="text-xs text-slate-400">até {formatDate(prova.endDate)}</div>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(prova)}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="font-bold">{prova._count.questions}</span> questões
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/provas/${prova.id}/questoes`}
                        className="text-slate-400 hover:text-primary transition-colors"
                        title="Gerenciar Questões"
                      >
                        <span className="material-symbols-outlined text-xl">quiz</span>
                      </Link>
                      <Link
                        href={`/provas/${prova.id}/editar`}
                        className="text-slate-400 hover:text-primary transition-colors"
                        title="Editar Prova"
                      >
                        <span className="material-symbols-outlined text-xl">edit</span>
                      </Link>
                      <Link
                        href={`/provas/${prova.id}/duplicar`}
                        className="text-slate-400 hover:text-blue-500 transition-colors"
                        title="Duplicar Prova"
                      >
                        <span className="material-symbols-outlined text-xl">content_copy</span>
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
