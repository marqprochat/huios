import Link from 'next/link';

const reports = [
  {
    href: '/relatorios/presenca',
    icon: 'how_to_reg',
    color: 'bg-blue-50 text-blue-600',
    title: 'Presença',
    description: 'Frequência por disciplina, faltas e justificativas por aluno.',
  },
  {
    href: '/relatorios/notas',
    icon: 'grade',
    color: 'bg-emerald-50 text-emerald-600',
    title: 'Notas',
    description: 'Notas por aluno, disciplina e tipo de avaliação.',
  },
  {
    href: '/relatorios/provas',
    icon: 'quiz',
    color: 'bg-violet-50 text-violet-600',
    title: 'Provas',
    description: 'Resultados, médias e taxa de conclusão por prova.',
  },
  {
    href: '/relatorios/alunos',
    icon: 'group',
    color: 'bg-amber-50 text-amber-600',
    title: 'Alunos',
    description: 'Visão geral por turma: média, frequência e situação.',
  },
];

export default function RelatoriosPage() {
  return (
    <div className="max-w-[1200px] mx-auto p-4 lg:p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Relatórios</h2>
        <p className="text-slate-500 dark:text-slate-400">Selecione um relatório para visualizar e exportar dados.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5">
        {reports.map(r => (
          <Link
            key={r.href}
            href={r.href}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex items-start gap-5 hover:shadow-md hover:border-primary/30 transition-all group"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${r.color}`}>
              <span className="material-symbols-outlined text-2xl">{r.icon}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 dark:text-white text-lg">{r.title}</h3>
                <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">arrow_forward</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{r.description}</p>
              <p className="text-xs text-primary font-semibold mt-3">Filtros • Exportar CSV • Clique na linha para detalhes</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
