'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { exportCSV } from '@/lib/exportCSV';

interface Row {
  studentId: string; studentName: string; studentEmail: string | null;
  classId: string; className: string; courseName: string; modality: string;
  enrollmentStatus: string; statusDate: string | null; statusReason: string | null;
  avgGrade: number | null; freqPct: number | null; absentCount: number; totalLessons: number;
}
interface ClassOption { id: string; name: string; course: { name: string } }

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  CURSANDO:  { label: 'Cursando',  color: 'text-blue-700',    bg: 'bg-blue-100' },
  APROVADO:  { label: 'Aprovado',  color: 'text-emerald-700', bg: 'bg-emerald-100' },
  REPROVADO: { label: 'Reprovado', color: 'text-red-700',     bg: 'bg-red-100' },
  TRANCADO:  { label: 'Trancado',  color: 'text-amber-700',   bg: 'bg-amber-100' },
};

export default function RelatorioAlunosPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [modality, setModality] = useState('');

  const load = (p: URLSearchParams) => {
    setLoading(true);
    fetch(`/api/relatorios/alunos?${p}`)
      .then(r => r.json())
      .then(d => { setRows(d.rows ?? []); setClasses(d.classes ?? []); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(new URLSearchParams()); }, []);

  useEffect(() => {
    const p = new URLSearchParams();
    if (classId) p.set('classId', classId);
    if (status) p.set('status', status);
    load(p);
  }, [classId, status]);

  const filtered = useMemo(() => rows.filter(r => {
    if (modality && r.modality !== modality) return false;
    if (search && !r.studentName.toLowerCase().includes(search.toLowerCase()) &&
      !r.className.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [rows, modality, search]);

  const handleExport = () => {
    exportCSV('alunos', ['Aluno', 'Email', 'Turma', 'Curso', 'Modalidade', 'Situação', 'Média', 'Frequência %', 'Faltas'],
      filtered.map(r => [
        r.studentName, r.studentEmail ?? '',
        r.className, r.courseName,
        r.modality === 'POR_PRESENCA' ? 'Por Presença' : 'Por Nota',
        STATUS_CONFIG[r.enrollmentStatus]?.label ?? r.enrollmentStatus,
        r.avgGrade ?? '—', r.freqPct ?? '—', r.absentCount,
      ]));
  };

  const stats = useMemo(() => ({
    total: filtered.length,
    cursando: filtered.filter(r => r.enrollmentStatus === 'CURSANDO').length,
    aprovado: filtered.filter(r => r.enrollmentStatus === 'APROVADO').length,
    reprovado: filtered.filter(r => r.enrollmentStatus === 'REPROVADO').length,
  }), [filtered]);

  return (
    <div className="max-w-[1600px] mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/relatorios" className="text-slate-400 hover:text-primary transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Relatório de Alunos</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Visão geral por turma: média, frequência e situação</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Turma</label>
            <select value={classId} onChange={e => setClassId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Todas</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name} — {c.course.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Situação</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Todas</option>
              {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Modalidade</label>
            <select value={modality} onChange={e => setModality(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Todas</option>
              <option value="POR_NOTA">Por Nota</option>
              <option value="POR_PRESENCA">Por Presença</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Buscar</label>
            <input type="text" placeholder="Nome ou turma..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-slate-700' },
          { label: 'Cursando', value: stats.cursando, color: 'text-blue-600' },
          { label: 'Aprovados', value: stats.aprovado, color: 'text-emerald-600' },
          { label: 'Reprovados', value: stats.reprovado, color: 'text-red-600' },
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
            <h3 className="font-bold text-slate-800 dark:text-white">{filtered.length} aluno{filtered.length !== 1 ? 's' : ''}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Clique na linha para ver o perfil completo do aluno</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  {['Aluno', 'Turma', 'Modalidade', 'Situação', 'Média', 'Frequência', 'Faltas'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(r => {
                  const st = STATUS_CONFIG[r.enrollmentStatus] ?? { label: r.enrollmentStatus, color: 'text-slate-600', bg: 'bg-slate-100' };
                  return (
                    <tr key={`${r.studentId}-${r.classId}`} onClick={() => router.push(`/alunos/${r.studentId}`)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-800 dark:text-white">{r.studentName}</p>
                        {r.studentEmail && <p className="text-xs text-slate-400">{r.studentEmail}</p>}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{r.className}</p>
                        <p className="text-xs text-slate-400">{r.courseName}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.modality === 'POR_PRESENCA' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>
                          {r.modality === 'POR_PRESENCA' ? 'Presença' : 'Nota'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${st.bg} ${st.color}`}>{st.label}</span>
                        {r.statusReason && <p className="text-[10px] text-slate-400 mt-0.5 max-w-[180px] truncate">{r.statusReason}</p>}
                      </td>
                      <td className="px-5 py-3.5">
                        {r.modality !== 'POR_PRESENCA' && r.avgGrade !== null
                          ? <span className={`text-lg font-black ${r.avgGrade >= 7 ? 'text-emerald-600' : 'text-red-600'}`}>{r.avgGrade.toFixed(1)}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {r.freqPct !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${r.freqPct >= 75 ? 'bg-emerald-500' : r.freqPct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${r.freqPct}%` }} />
                            </div>
                            <span className={`text-sm font-bold ${r.freqPct >= 75 ? 'text-emerald-600' : r.freqPct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                              {r.freqPct}%
                            </span>
                          </div>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`font-bold ${r.absentCount >= 2 ? 'text-red-600' : 'text-slate-600'}`}>{r.absentCount}</span>
                        {r.absentCount >= 2 && <span className="ml-1.5 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">!</span>}
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
          <span className="material-symbols-outlined text-5xl mb-3">group</span>
          <p>Nenhum aluno encontrado com os filtros selecionados</p>
        </div>
      )}
    </div>
  );
}
