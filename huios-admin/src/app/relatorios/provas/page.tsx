'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { exportCSV } from '@/lib/exportCSV';

interface ExamRow {
  id: string; title: string; isPublished: boolean;
  startDate: string; endDate: string;
  questionCount: number; submissionCount: number; completedCount: number;
  avgGrade: number | null;
  discipline: { id: string; name: string; courseClasses: { name: string }[] };
}
interface Option { id: string; name: string; courseClasses?: { name: string }[] }

const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' });

export default function RelatorioProvasPage() {
  const router = useRouter();
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [disciplines, setDisciplines] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);

  const [disciplineId, setDisciplineId] = useState('');
  const [published, setPublished] = useState('');
  const [search, setSearch] = useState('');

  const load = (p: URLSearchParams) => {
    setLoading(true);
    fetch(`/api/relatorios/provas?${p}`)
      .then(r => r.json())
      .then(d => { setExams(d.exams ?? []); setDisciplines(d.disciplines ?? []); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(new URLSearchParams()); }, []);

  useEffect(() => {
    const p = new URLSearchParams();
    if (disciplineId) p.set('disciplineId', disciplineId);
    if (published) p.set('published', published);
    load(p);
  }, [disciplineId, published]);

  const filtered = useMemo(() => exams.filter(e =>
    !search || e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.discipline.name.toLowerCase().includes(search.toLowerCase())
  ), [exams, search]);

  const now = new Date();
  const getStatus = (e: ExamRow) => {
    if (!e.isPublished) return { label: 'Rascunho', color: 'bg-slate-100 text-slate-500' };
    if (new Date(e.endDate) < now) return { label: 'Encerrada', color: 'bg-gray-100 text-gray-600' };
    if (new Date(e.startDate) > now) return { label: 'Agendada', color: 'bg-blue-100 text-blue-700' };
    return { label: 'Em Andamento', color: 'bg-green-100 text-green-700' };
  };

  const avgAll = useMemo(() => {
    const withGrade = filtered.filter(e => e.avgGrade !== null);
    if (!withGrade.length) return null;
    return (withGrade.reduce((a, e) => a + e.avgGrade!, 0) / withGrade.length).toFixed(1);
  }, [filtered]);

  const handleExport = () => {
    exportCSV('provas', ['Prova', 'Disciplina', 'Turma', 'Status', 'Início', 'Fim', 'Questões', 'Submetidas', 'Concluídas', 'Média'],
      filtered.map(e => [
        e.title, e.discipline.name,
        e.discipline.courseClasses.map(c => c.name).join(', '),
        getStatus(e).label, fmtDate(e.startDate), fmtDate(e.endDate),
        e.questionCount, e.submissionCount, e.completedCount,
        e.avgGrade ?? '—',
      ]));
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/relatorios" className="text-slate-400 hover:text-primary transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Relatório de Provas</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Resultados, médias e taxa de conclusão</p>
          </div>
        </div>
        {filtered.length > 0 && (
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-all">
            <span className="material-symbols-outlined text-sm">download</span>Exportar CSV
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Disciplina</label>
            <select value={disciplineId} onChange={e => setDisciplineId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Todas</option>
              {disciplines.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Situação</label>
            <select value={published} onChange={e => setPublished(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Todas</option>
              <option value="true">Publicadas</option>
              <option value="false">Rascunho</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Buscar</label>
            <input type="text" placeholder="Nome da prova ou disciplina..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total de Provas', value: filtered.length, color: 'text-slate-700' },
          { label: 'Publicadas', value: filtered.filter(e => e.isPublished).length, color: 'text-emerald-600' },
          { label: 'Média Geral', value: avgAll ?? '—', color: 'text-primary' },
          { label: 'Submissões', value: filtered.reduce((a, e) => a + e.completedCount, 0), color: 'text-slate-700' },
        ].map(c => (
          <div key={c.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{c.label}</p>
            <p className={`text-3xl font-black mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16"><span className="material-symbols-outlined text-4xl animate-spin text-primary">refresh</span></div>
      ) : filtered.length > 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-800 dark:text-white">{filtered.length} prova{filtered.length !== 1 ? 's' : ''}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Clique na linha para gerenciar as questões</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  {['Prova', 'Disciplina', 'Período', 'Status', 'Questões', 'Concluídas', 'Média'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(e => {
                  const st = getStatus(e);
                  const concPct = e.submissionCount > 0 ? Math.round((e.completedCount / e.submissionCount) * 100) : 0;
                  return (
                    <tr key={e.id} onClick={() => router.push(`/provas/${e.id}/questoes`)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-800 dark:text-white">{e.title}</p>
                        <p className="text-xs text-slate-400">{e.discipline.courseClasses.map(c => c.name).join(', ')}</p>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-primary font-semibold">{e.discipline.name}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        <div>{fmtDate(e.startDate)}</div>
                        <div className="text-slate-400">até {fmtDate(e.endDate)}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${st.color}`}>{st.label}</span>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-700">{e.questionCount}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${concPct}%` }} />
                          </div>
                          <span className="text-sm font-bold text-slate-600">{e.completedCount}</span>
                          <span className="text-xs text-slate-400">({concPct}%)</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {e.avgGrade !== null
                          ? <span className={`text-lg font-black ${e.avgGrade >= 7 ? 'text-emerald-600' : 'text-red-600'}`}>{e.avgGrade.toFixed(1)}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-slate-400">
          <span className="material-symbols-outlined text-5xl mb-3">quiz</span>
          <p>Nenhuma prova encontrada</p>
        </div>
      )}
    </div>
  );
}
