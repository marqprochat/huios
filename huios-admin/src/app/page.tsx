'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DashboardStats {
  totalStudents: number;
  studentsGrowth: string;
  totalTeachers: number;
  totalDisciplines: number;
  newEnrollments: string;
}

interface Pendency {
  id: string;
  studentName: string;
  type: string;
  deadline: string;
  status: string;
}

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
}

export default function Home() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendencies, setPendencies] = useState<Pendency[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/dashboard/stats');
        const data = await res.json();
        if (res.ok) {
          setStats(data.stats);
          setPendencies(data.pendencies);
          setEvents(data.events);
        }
      } catch (e) {
        console.error('Failed to fetch dashboard data', e);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="material-symbols-outlined animate-spin text-[#135bec] text-4xl">refresh</span>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto p-4 lg:p-8 space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Gestão Acadêmica
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Visão geral do Huios Seminário Teológico</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/alunos?new=true" className="bg-[#135bec] text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-95 transition-all shadow-lg shadow-[#135bec]/25">
            <span className="material-symbols-outlined text-lg">person_add</span>
            Novo Aluno
          </Link>
          <button className="bg-white dark:bg-slate-800 text-[#135bec] border border-[#135bec]/30 px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[#135bec]/5 transition-all">
            <span className="material-symbols-outlined text-lg">school</span>
            Novo Professor
          </button>
          <button className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
            <span className="material-symbols-outlined">more_vert</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon="group"
          title="Total de Alunos"
          value={String(stats?.totalStudents || 0)}
          subtitle={stats?.studentsGrowth || '0%'}
          isSuccess
        />
        <StatCard
          icon="school"
          title="Professores Ativos"
          value={String(stats?.totalTeachers || 0)}
          subtitle="Equipe docente estável"
        />
        <StatCard
          icon="menu_book"
          title="Disciplinas em Curso"
          value={String(stats?.totalDisciplines || 0)}
          subtitle="Semestre 2024.1"
        />
        <StatCard
          icon="how_to_reg"
          title="Novas Matrículas"
          value={stats?.newEnrollments || '+0'}
          subtitle="Mês atual"
          isSuccess
          customColor="emerald"
        />
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Pending Tasks (Tabela) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 text-amber-600 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined">warning</span>
              </div>
              <h3 className="font-black text-lg text-slate-800 dark:text-slate-100">Pendências Acadêmicas</h3>
            </div>
            <Link href="/relatorios/pendencias" className="text-[#135bec] text-xs font-bold hover:underline">Ver todas</Link>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">Aluno</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">Tipo de Pendência</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">Prazo</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-wider text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pendencies.length > 0 ? pendencies.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                          {p.studentName.split(' ').map(n=>n[0]).join('')}
                        </div>
                        <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{p.studentName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${
                        p.type.includes('Falta') ? 'bg-amber-50 text-amber-600 border border-amber-200' : 
                        'bg-red-50 text-red-600 border border-red-200'
                      }`}>
                        {p.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500">{p.deadline}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button className="w-8 h-8 rounded-lg bg-[#135bec]/10 text-[#135bec] flex items-center justify-center hover:bg-[#135bec]/20 transition-all">
                          <span className="material-symbols-outlined text-sm">mail</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                      Nenhuma pendência crítica encontrada no momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Next Events (Próximos Eventos) */}
        <div className="space-y-4 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#135bec]/10 text-[#135bec] rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined">calendar_month</span>
              </div>
              <h3 className="font-black text-lg text-slate-800 dark:text-slate-100">Próximos Eventos</h3>
            </div>
            <button className="text-[#135bec] text-xs font-bold hover:underline">Calendário</button>
          </div>

          <div className="space-y-3">
            {events.length > 0 ? events.map((e) => (
              <div key={e.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex gap-4 hover:shadow-md transition-shadow">
                <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-xl flex flex-col items-center justify-center flex-shrink-0 border border-slate-100 dark:border-slate-700">
                  <span className="text-xs font-black text-[#135bec] uppercase">{e.date.split(' ')[0]}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{e.date.split(' ')[1]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-sm text-slate-800 dark:text-slate-100 truncate">{e.title}</h4>
                  <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-xs">schedule</span> {e.time} • {e.location}
                  </p>
                </div>
              </div>
            )) : (
              <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-400 font-medium text-sm">
                Nenhum evento agendado para os próximos dias.
              </div>
            )}
          </div>

          {/* Support Card */}
          <div className="mt-8 bg-[#135bec] rounded-2xl p-6 text-white overflow-hidden relative group">
            <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
            <h3 className="font-black text-lg relative z-10">Suporte Acadêmico</h3>
            <p className="text-white/80 text-xs mt-2 leading-relaxed font-bold relative z-10">
              Precisa de ajuda com o sistema ou orientações pedagógicas?
            </p>
            <button className="mt-6 w-full bg-white text-[#135bec] py-3 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors relative z-10">
              Entrar em contato
            </button>
            <div className="absolute bottom-4 right-4 opacity-20 pointer-events-none">
              <span className="material-symbols-outlined text-6xl">headset_mic</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, subtitle, isSuccess, customColor }: { 
  icon: string, 
  title: string, 
  value: string, 
  subtitle: string, 
  isSuccess?: boolean,
  customColor?: string 
}) {
  const isEmerald = customColor === 'emerald' || isSuccess;
  const iconBg = isEmerald ? 'bg-emerald-500/10 text-emerald-500' : 'bg-[#135bec]/10 text-[#135bec]';
  const pSubtitleColor = isSuccess ? 'text-emerald-600' : 'text-slate-400 font-bold';

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-5 hover:border-[#135bec]/30 transition-all group">
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${iconBg}`}>
        <span className="material-symbols-outlined text-2xl">{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{title}</p>
        <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{value}</h3>
        <p className={`text-[10px] flex items-center gap-1 mt-1 ${pSubtitleColor}`}>
          {isSuccess && <span className="material-symbols-outlined text-[10px]">trending_up</span>}
          {subtitle}
        </p>
      </div>
    </div>
  );
}
