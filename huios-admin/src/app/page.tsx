export default function Home() {
  return (
    <div className="max-w-[1600px] mx-auto p-4 lg:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Gestão Acadêmica</h2>
          <p className="text-slate-500 dark:text-slate-400">Visão geral do Huios Seminário Teológico</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-sm">person_add</span>
            Novo Aluno
          </button>
          <button className="bg-primary/10 text-primary px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary/20 transition-all">
            <span className="material-symbols-outlined text-sm">assignment_add</span>
            Novo Professor
          </button>
          <button className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-50 transition-all">
            <span className="material-symbols-outlined text-sm">more_vert</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard icon="group" title="Total de Alunos" value="482" subtitle="+5% desde o último mês" subtitleColor="emerald" />
        <DashboardCard icon="school" title="Professores Ativos" value="34" subtitle="Equipe docente estável" subtitleColor="slate" />
        <DashboardCard icon="menu_book" title="Disciplinas em Curso" value="18" subtitle="Semestre 2024.1" subtitleColor="slate" />
        <DashboardCard icon="how_to_reg" title="Novas Matrículas" value="+24" subtitle="Mês atual" subtitleColor="emerald" customColor="emerald" />
      </div>
    </div>
  );
}

function DashboardCard({ icon, title, value, subtitle, subtitleColor, customColor }: { icon: string, title: string, value: string, subtitle: string, subtitleColor: string, customColor?: string }) {
  const isEmerald = customColor === 'emerald';
  const iconBg = isEmerald ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/5 text-primary';
  const pSubtitleColor = subtitleColor === 'emerald' ? 'text-emerald-600' : 'text-slate-400';

  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div>
        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{title}</p>
        <h3 className="text-2xl font-black">{value}</h3>
        <p className={`text-[10px] font-bold flex items-center gap-1 ${pSubtitleColor}`}>
          {subtitle}
        </p>
      </div>
    </div>
  );
}
