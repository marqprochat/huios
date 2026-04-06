'use client';

import { useState, useEffect } from 'react';
import { useStudent } from '../components/PortalShell';

interface DisciplineGrade {
  id: string;
  name: string;
  teacher: { name: string } | null;
  courseClass: { name: string; course: { name: string } };
  grades: Array<{
    id: string;
    score: number;
    weight: number;
    type: string;
    title: string | null;
    exam: { title: string } | null;
    createdAt: string;
  }>;
}

export default function BoletimPage() {
  const { data } = useStudent();
  const [disciplines, setDisciplines] = useState<DisciplineGrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBoletim();
  }, []);

  const fetchBoletim = async () => {
    try {
      const res = await fetch('/api/portal/boletim');
      if (res.ok) {
        const d = await res.json();
        setDisciplines(d.disciplines || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const calcMedia = (grades: any[]) => {
    if (grades.length === 0) return null;
    const totalWeight = grades.reduce((acc: number, g: any) => acc + g.weight, 0);
    const weightedSum = grades.reduce((acc: number, g: any) => acc + g.score * g.weight, 0);
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  };

  const getStatus = (media: number | null) => {
    if (media === null) return { label: 'Cursando', color: 'text-slate-400', bg: 'bg-slate-50' };
    if (media >= 7) return { label: 'Aprovado', color: 'text-emerald-600', bg: 'bg-emerald-50' };
    if (media >= 5) return { label: 'Recuperação', color: 'text-amber-600', bg: 'bg-amber-50' };
    return { label: 'Reprovado', color: 'text-red-600', bg: 'bg-red-50' };
  };

  if (!data) return null;

  // Overall average
  const allGrades = disciplines.flatMap(d => d.grades);
  const overallAvg = allGrades.length > 0 
    ? (allGrades.reduce((a, g) => a + g.score, 0) / allGrades.length).toFixed(1) 
    : '—';

  // Pendencies
  const pendencies = disciplines.filter(d => {
    const m = calcMedia(d.grades);
    return m !== null && m < 7;
  });

  return (
    <div className="max-w-[1400px] mx-auto p-4 lg:p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Boletim</h2>
        <p className="text-slate-500 text-sm">Consulte suas notas e desempenho acadêmico</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Média Geral</p>
          <p className="text-3xl font-bold text-[#135bec] mt-1">{overallAvg}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Disciplinas</p>
          <p className="text-3xl font-bold text-slate-700 mt-1">{disciplines.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avaliações</p>
          <p className="text-3xl font-bold text-slate-700 mt-1">{allGrades.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pendências</p>
          <p className={`text-3xl font-bold mt-1 ${pendencies.length > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
            {pendencies.length}
          </p>
        </div>
      </div>

      {/* Pendencies Alert */}
      {pendencies.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-red-500">warning</span>
            <h3 className="font-semibold text-red-800 text-sm">Pendências Acadêmicas</h3>
          </div>
          <p className="text-red-700 text-xs leading-relaxed">
            Você está abaixo da média (7.0) nas seguintes disciplinas:{' '}
            <strong>{pendencies.map(d => d.name).join(', ')}</strong>.
            Procure o coordenador para orientações.
          </p>
        </div>
      )}

      {/* Disciplines Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="material-symbols-outlined animate-spin text-[#135bec] text-3xl">refresh</span>
        </div>
      ) : (
        <div className="space-y-4">
          {disciplines.map((disc) => {
            const media = calcMedia(disc.grades);
            const status = getStatus(media);

            return (
              <div key={disc.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#135bec]/5 rounded-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#135bec]">menu_book</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800">{disc.name}</h4>
                      <p className="text-xs text-slate-400">
                        {disc.teacher?.name ? `Prof. ${disc.teacher.name}` : 'Sem professor'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Média</p>
                      <p className={`text-xl font-bold ${
                        media !== null && media >= 7 ? 'text-emerald-600' :
                        media !== null && media >= 5 ? 'text-amber-600' :
                        media !== null ? 'text-red-600' : 'text-slate-300'
                      }`}>
                        {media !== null ? media.toFixed(1) : '—'}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                </div>

                {disc.grades.length > 0 && (
                  <div className="border-t border-slate-100 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {disc.grades.map((grade) => (
                        <div key={grade.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                          <div>
                            <p className="text-xs font-medium text-slate-700">{grade.title || grade.exam?.title || 'Avaliação'}</p>
                            <p className="text-[10px] text-slate-400 capitalize">{grade.type.toLowerCase()}</p>
                          </div>
                          <span className={`font-bold text-sm ${
                            grade.score >= 7 ? 'text-emerald-600' : grade.score >= 5 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {grade.score.toFixed(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {disciplines.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-3">school</span>
              <p className="text-slate-500">Nenhuma disciplina encontrada</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
