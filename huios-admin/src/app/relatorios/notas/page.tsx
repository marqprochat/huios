'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { exportCSV } from '@/lib/exportCSV';

interface Grade {
  id: string; score: number; weight: number; type: string; title: string | null; createdAt: string;
  student: { id: string; name: string };
  discipline: { id: string; name: string; courseClasses: { id: string; name: string; course: { name: string } }[] };
  exam: { title: string } | null;
}
interface Option { id: string; name: string }

const TYPE_LABELS: Record<string, string> = { EXAM: 'Prova', MANUAL: 'Manual', ACTIVITY: 'Atividade', PARTICIPATION: 'Participação' };

export default function RelatorioNotasPage() {
  const router = useRouter();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<(Option & { course: { name: string } })[]>([]);
  const [disciplines, setDisciplines] = useState<Option[]>([]);
  const [students, setStudents] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);

  const [classId, setClassId] = useState('');
  const [disciplineId, setDisciplineId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');

  const load = (params: URLSearchParams) => {
    setLoading(true);
    fetch(`/api/relatorios/notas?${params}`)
      .then(r => r.json())
      .then(d => { setGrades(d.grades ?? []); setClasses(d.classes ?? []); setDisciplines(d.disciplines ?? []); setStudents(d.students ?? []); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(new URLSearchParams()); }, []);

  useEffect(() => {
    const p = new URLSearchParams();
    if (classId) p.set('classId', classId);
    if (disciplineId) p.set('disciplineId', disciplineId);
    if (studentId) p.set('studentId', studentId);
    load(p);
  }, [classId, disciplineId, studentId]);

  const filtered = useMemo(() => grades.filter(g => {
    if (type && g.type !== type) return false;
    if (search && !g.student.name.toLowerCase().includes(search.toLowerCase()) &&
      !g.discipline.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [grades, type, search]);

  const avgGrade = useMemo(() => {
    if (!filtered.length) return null;
    return (filtered.reduce((a, g) => a + g.score, 0) / filtered.length).toFixed(1);
  }, [filtered]);

  const approvedPct = useMemo(() => {
    if (!filtered.length) return null;
    return Math.round((filtered.filter(g => g.score >= 7).length / filtered.length) * 100);
  }, [filtered]);

  const handleExport = () => {
    exportCSV('notas', ['Aluno', 'Disciplina', 'Turma', 'Tipo', 'Título', 'Nota', 'Data'],
      filtered.map(g => [
        g.student.name, g.discipline.name,
        g.discipline.courseClasses[0]?.name ?? '—',
        TYPE_LABELS[g.type] ?? g.type,
        g.title ?? g.exam?.title ?? '—',
        g.score, new Date(g.createdAt).toLocaleDateString('pt-BR'),
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
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Relatório de Notas</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Notas por aluno, disciplina e tipo</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Turma</label>
            <select value={classId} onChange={e => setClassId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Todas</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name} — {c.course.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Disciplina</label>
            <select value={disciplineId} onChange={e => setDisciplineId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Todas</option>
              {disciplines.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Aluno</label>
            <select value={studentId} onChange={e => setStudentId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Todos</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Tipo</label>
            <select value={type} onChange={e => setType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Todos</option>
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Buscar</label>
            <input type="text" placeholder="Aluno ou disciplina..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Registros', value: filtered.length, color: 'text-slate-700' },
          { label: 'Média Geral', value: avgGrade ?? '—', color: avgGrade && parseFloat(avgGrade) >= 7 ? 'text-emerald-600' : 'text-amber-600' },
          { label: 'Aprovados', value: approvedPct != null ? `${approvedPct}%` : '—', color: 'text-emerald-600' },
          { label: 'Abaixo 7,0', value: filtered.filter(g => g.score < 7).length, color: 'text-red-600' },
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
            <h3 className="font-bold text-slate-800 dark:text-white">Notas — {filtered.length} registro{filtered.length !== 1 ? 's' : ''}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Clique na linha para ver o perfil do aluno</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  {['Aluno', 'Disciplina', 'Turma', 'Tipo', 'Título', 'Nota', 'Data'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(g => (
                  <tr key={g.id} onClick={() => router.push(`/alunos/${g.student.id}`)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-white">{g.student.name}</td>
                    <td className="px-5 py-3.5 text-sm text-primary font-semibold">{g.discipline.name}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-500">{g.discipline.courseClasses[0]?.name ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {TYPE_LABELS[g.type] ?? g.type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600 dark:text-slate-400 max-w-[200px] truncate">{g.title ?? g.exam?.title ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-lg font-black ${g.score >= 7 ? 'text-emerald-600' : 'text-red-600'}`}>{g.score.toFixed(1)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-400">{new Date(g.createdAt).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-slate-400">
          <span className="material-symbols-outlined text-5xl mb-3">grade</span>
          <p>Nenhuma nota encontrada com os filtros selecionados</p>
        </div>
      )}
    </div>
  );
}
