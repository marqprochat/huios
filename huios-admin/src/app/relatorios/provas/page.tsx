'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { exportCSV } from '@/lib/exportCSV';
import { exportReportPDF, REPORT_COLORS, type ReportSection } from '@/lib/pdf/reportPDF';

interface StudentResult {
  studentId: string;
  studentName: string;
  score: number | null;
  submittedAt: string | null;
  startedAt: string;
}

interface ExamRow {
  id: string; title: string; isPublished: boolean;
  startDate: string; endDate: string;
  questionCount: number; submissionCount: number; completedCount: number;
  avgGrade: number | null;
  submissions: StudentResult[];
  discipline: { id: string; name: string; courseClasses: { name: string }[] };
}
interface Option { id: string; name: string; courseClasses?: { name: string }[] }

const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' });
const fmtDateTime = (d: string) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

export default function RelatorioProvasPage() {
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [disciplines, setDisciplines] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    const rows: (string | number)[][] = [];
    filtered.forEach(e => {
      const st = getStatus(e);
      if (e.submissions.length === 0) {
        rows.push([e.title, e.discipline.name, e.discipline.courseClasses.map(c => c.name).join(', '),
          st.label, fmtDate(e.startDate), fmtDate(e.endDate), '—', '—', '—']);
      } else {
        e.submissions.forEach(s => {
          rows.push([e.title, e.discipline.name, e.discipline.courseClasses.map(c => c.name).join(', '),
            st.label, fmtDate(e.startDate), fmtDate(e.endDate),
            s.studentName,
            s.score !== null ? s.score.toFixed(1) : '—',
            s.submittedAt ? fmtDateTime(s.submittedAt) : '—']);
        });
      }
    });
    exportCSV('provas', ['Prova', 'Disciplina', 'Turma', 'Status', 'Início', 'Fim', 'Aluno', 'Nota', 'Realizada em'], rows);
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const sections: ReportSection[] = [{
        kind: 'table',
        title: 'Resumo das provas',
        head: ['Prova', 'Disciplina', 'Turma', 'Status', 'Início', 'Fim', 'Questões', 'Concluídas', 'Média'],
        body: filtered.map(e => [
          e.title,
          e.discipline.name,
          e.discipline.courseClasses.map(c => c.name).join(', ') || '—',
          getStatus(e).label,
          fmtDate(e.startDate),
          fmtDate(e.endDate),
          e.questionCount,
          `${e.completedCount}/${e.submissionCount}`,
          e.avgGrade !== null ? e.avgGrade.toFixed(1) : '—',
        ]),
        columnStyles: {
          6: { halign: 'center' },
          7: { halign: 'center' },
          8: { halign: 'center', fontStyle: 'bold' },
        },
      }];

      // Detalhamento individual de cada prova com os resultados por aluno.
      filtered.forEach(e => {
        sections.push({
          kind: 'heading',
          title: e.title,
          subtitle: `${e.discipline.name} • ${e.discipline.courseClasses.map(c => c.name).join(', ') || 'sem turma'} • ${getStatus(e).label} • ${fmtDate(e.startDate)} a ${fmtDate(e.endDate)}`,
        });
        sections.push({
          kind: 'metrics',
          metrics: [
            { label: 'Questões', value: e.questionCount, color: REPORT_COLORS.slate },
            { label: 'Participantes', value: e.submissionCount, color: REPORT_COLORS.blue },
            { label: 'Concluídas', value: e.completedCount, color: REPORT_COLORS.green },
            { label: 'Média', value: e.avgGrade !== null ? e.avgGrade.toFixed(1) : '—', color: e.avgGrade !== null && e.avgGrade >= 7 ? REPORT_COLORS.green : REPORT_COLORS.amber },
          ],
        });
        sections.push({
          kind: 'table',
          head: ['Aluno', 'Nota', 'Iniciada em', 'Realizada em'],
          body: e.submissions.length
            ? e.submissions.map(s => [
              s.studentName,
              s.score !== null ? s.score.toFixed(1) : '—',
              fmtDateTime(s.startedAt),
              s.submittedAt ? fmtDateTime(s.submittedAt) : 'Não entregue',
            ])
            : [['Nenhum aluno realizou esta prova', '—', '—', '—']],
          columnStyles: {
            1: { halign: 'center', cellWidth: 20 },
            2: { halign: 'center', cellWidth: 38 },
            3: { halign: 'center', cellWidth: 38 },
          },
        });
      });

      await exportReportPDF({
        title: 'Relatório de Provas',
        fileName: 'relatorio-provas',
        filters: [
          { label: 'Disciplina', value: disciplines.find(d => d.id === disciplineId)?.name ?? 'Todas' },
          { label: 'Publicação', value: published === 'true' ? 'Publicadas' : published === 'false' ? 'Rascunhos' : 'Todas' },
          { label: 'Busca', value: search.trim() || 'Não informada' },
        ],
        metrics: [
          { label: 'Provas', value: filtered.length, color: REPORT_COLORS.slate },
          { label: 'Participações', value: filtered.reduce((a, e) => a + e.submissionCount, 0), color: REPORT_COLORS.blue },
          { label: 'Concluídas', value: filtered.reduce((a, e) => a + e.completedCount, 0), color: REPORT_COLORS.green },
          { label: 'Média geral', value: avgAll ?? '—', color: avgAll && parseFloat(avgAll) >= 7 ? REPORT_COLORS.green : REPORT_COLORS.amber },
        ],
        sections,
      });
    } finally {
      setExportingPDF(false);
    }
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
            <p className="text-slate-500 dark:text-slate-400 text-sm">Notas por aluno, médias e data de realização</p>
          </div>
        </div>
        {filtered.length > 0 && (
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
              <span className="material-symbols-outlined text-sm">download</span>Exportar CSV
            </button>
            <button onClick={handleExportPDF} disabled={exportingPDF} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-all disabled:cursor-not-allowed disabled:opacity-60">
              <span className="material-symbols-outlined text-sm">picture_as_pdf</span>{exportingPDF ? 'Gerando PDF...' : 'Exportar PDF'}
            </button>
          </div>
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

      {/* List */}
      {loading ? (
        <div className="text-center py-16"><span className="material-symbols-outlined text-4xl animate-spin text-primary">refresh</span></div>
      ) : filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map(e => {
            const st = getStatus(e);
            const isOpen = expandedId === e.id;
            return (
              <div key={e.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                {/* Exam header row */}
                <button
                  onClick={() => setExpandedId(isOpen ? null : e.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-left"
                >
                  <span className={`material-symbols-outlined text-lg text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}>
                    chevron_right
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="font-bold text-slate-800 dark:text-white">{e.title}</p>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${st.color}`}>{st.label}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {e.discipline.name}
                      {e.discipline.courseClasses.length > 0 && ` · ${e.discipline.courseClasses.map(c => c.name).join(', ')}`}
                      {' · '}{fmtDate(e.startDate)} até {fmtDate(e.endDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-6 shrink-0 text-right">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alunos</p>
                      <p className="text-lg font-black text-slate-700">{e.completedCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Média</p>
                      <p className={`text-lg font-black ${e.avgGrade === null ? 'text-slate-300' : e.avgGrade >= 7 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {e.avgGrade !== null ? e.avgGrade.toFixed(1) : '—'}
                      </p>
                    </div>
                  </div>
                </button>

                {/* Students table */}
                {isOpen && (
                  <div className="border-t border-slate-100 dark:border-slate-800">
                    {e.submissions.length === 0 ? (
                      <div className="px-6 py-6 text-center text-slate-400 text-sm">Nenhum aluno realizou esta prova ainda.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[500px]">
                          <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                              {['Aluno', 'Nota', 'Realizada em'].map(h => (
                                <th key={h} className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {e.submissions.map(s => (
                              <tr key={s.studentId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                <td className="px-5 py-3 font-medium text-slate-800 dark:text-white">{s.studentName}</td>
                                <td className="px-5 py-3">
                                  {s.score !== null ? (
                                    <span className={`text-base font-black ${s.score >= 7 ? 'text-emerald-600' : 'text-red-500'}`}>
                                      {s.score.toFixed(1)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 text-sm">Em andamento</span>
                                  )}
                                </td>
                                <td className="px-5 py-3 text-sm text-slate-500">
                                  {s.submittedAt ? fmtDateTime(s.submittedAt) : (
                                    <span className="text-slate-300">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
