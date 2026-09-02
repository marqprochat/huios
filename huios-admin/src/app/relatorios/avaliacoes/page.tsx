import Link from 'next/link';

const options = [
  {
    href: '/relatorios/avaliacoes/professor',
    icon: 'school',
    color: 'bg-indigo-50 text-indigo-600',
    title: 'Por Professor',
    description: 'Perfil completo de cada professor com a avaliação de todas as suas disciplinas.',
    hint: 'Notas por critério • Participação • Observações • PDF',
  },
  {
    href: '/relatorios/avaliacoes/disciplina',
    icon: 'book',
    color: 'bg-teal-50 text-teal-600',
    title: 'Por Disciplina',
    description: 'Cada disciplina detalhada com a avaliação de todos os professores que a lecionaram.',
    hint: 'Comparativo entre professores • Observações • PDF',
  },
];

export default function RelatorioAvaliacoesPage() {
  return (
    <div className="max-w-[1200px] mx-auto p-4 lg:p-8 space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/relatorios" className="text-slate-400 hover:text-primary transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Avaliação do Professor</h2>
          <p className="text-slate-500 dark:text-slate-400">Escolha como deseja visualizar o feedback dos alunos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {options.map(option => (
          <Link
            key={option.href}
            href={option.href}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex items-start gap-5 hover:shadow-md hover:border-primary/30 transition-all group"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${option.color}`}>
              <span className="material-symbols-outlined text-2xl">{option.icon}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 dark:text-white text-lg">{option.title}</h3>
                <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">arrow_forward</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{option.description}</p>
              <p className="text-xs text-primary font-semibold mt-3">{option.hint}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
