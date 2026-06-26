'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { exportCSV } from '@/lib/exportCSV';
import { exportAttendanceHTML, type AttendanceDay } from '@/lib/exportAttendanceHTML';

interface CourseClass { id: string; name: string; course: { name: string } }
interface StudentStat {
  student: { id: string; name: string };
  total: number; present: number; absent: number; excused: number; percentage: number;
}
interface Lesson {
  id: string; date: string; startTime: string | null; endTime: string | null; locationName: string | null;
  disciplineName: string;
  attendances: { status: string; student: { id: string; name: string } }[];
}

const cls = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ');

const STATUS_UI: Record<string, { label: string; cls: string; icon: string }> = {
  PRESENT: { label: 'Presente', cls: 'text-emerald-600 bg-emerald-100', icon: 'check_circle' },
  ABSENT: { label: 'Falta', cls: 'text-red-600 bg-red-100', icon: 'cancel' },
  EXCUSED: { label: 'Justificada', cls: 'text-amber-600 bg-amber-100', icon: 'event_available' },
  PENDING: { label: 'Pendente', cls: 'text-slate-500 bg-slate-100', icon: 'schedule' },
};

export default function RelatorioPresencaPage() {
  const [classes, setClasses] = useState<CourseClass[]>([]);
  const [classId, setClassId] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [search, setSearch] = useState('');
  const [studentStats, setStudentStats] = useState<StudentStat[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailStudent, setDetailStudent] = useState<StudentStat | null>(null);

  useEffect(() => {
    fetch('/api/relatorios/presenca').then(r => r.json()).then(d => setClasses(d.classes ?? []));
  }, []);

  useEffect(() => {
    if (!classId) return;
    setLoading(true);
    const p = new URLSearchParams({ classId });
    if (start) p.set('start', start);
    if (end) p.set('end', end);
    fetch(`/api/relatorios/presenca?${p}`)
      .then(r => r.json())
      .then(d => { setStudentStats(d.studentStats ?? []); setLessons(d.lessons ?? []); })
      .finally(() => setLoading(false));
  }, [classId, start, end]);

  const filtered = useMemo(() =>
    studentStats.filter(s => s.student.name.toLowerCase().includes(search.toLowerCase())),
    [studentStats, search]);

  const overallPct = useMemo(() => {
    const total = studentStats.reduce((a, s) => a + s.total, 0);
    const pres = studentStats.reduce((a, s) => a + s.present + s.excused, 0);
    return total > 0 ? Math.round((pres / total) * 100) : 0;
  }, [studentStats]);

  const selectedClass = classes.find(c => c.id === classId);
  const className = selectedClass ? `${selectedClass.course.name} — ${selectedClass.name}` : 'relatorio';
  const periodLabel = start || end ? `${start ? new Date(start).toLocaleDateString('pt-BR') : '…'} a ${end ? new Date(end).toLocaleDateString('pt-BR') : '…'}` : undefined;

  // Detalhe dia-a-dia do aluno selecionado (computado a partir das aulas já carregadas)
  const studentDays: AttendanceDay[] = useMemo(() => {
    if (!detailStudent) return [];
    return lessons.map(l => {
      const att = l.attendances.find(a => a.student.id === detailStudent.student.id);
      return {
        date: l.date,
        disciplineName: l.disciplineName,
        status: (att?.status as AttendanceDay['status']) ?? 'PENDING',
      };
    }).sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [detailStudent, lessons]);

  const handleExport = () => {
    exportCSV(`presenca-${className}`, ['Aluno', 'Total', 'Presente', 'Falta', 'Justificada', 'Frequência %'],
      filtered.map(s => [s.student.name, s.total, s.present, s.absent, s.excused, s.percentage]));
  };

  const handleExportStudent = () => {
    if (!detailStudent) return;
    exportAttendanceHTML({
      studentName: detailStudent.student.name,
      className,
      periodLabel,
      total: detailStudent.total,
      present: detailStudent.present,
      absent: detailStudent.absent,
      excused: detailStudent.excused,
      percentage: detailStudent.percentage,
      days: studentDays,
    });
  };

  const freqColor = (pct: number) =>
    pct >= 75 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="max-w-[1600px] mx-auto p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/relatorios" className="text-slate-400 hover:text-primary transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Relatório de Presença</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Frequência por turma e aluno</p>
          </div>
        </div>
        {studentStats.length > 0 && (
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-all">
            <span className="material-symbols-outlined text-sm">download</span>
            Exportar CSV
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Turma *</label>
            <select value={classId} onChange={e => setClassId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/30 outline-none">
              <option value="">Selecione...</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.course.name} — {c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Data Inicial</label>
            <input type="date" value={start} onChange={e => setStart(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/30 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Data Final</label>
            <input type="date" value={end} onChange={e => setEnd(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/30 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Buscar Aluno</label>
            <input type="text" placeholder="Nome..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/30 outline-none" />
          </div>
        </div>
      </div>

      {/* Empty state */}
      {!classId && (
        <div className="text-center py-16 text-slate-400">
          <span className="material-symbols-outlined text-5xl mb-3">tune</span>
          <p>Selecione uma turma para gerar o relatório</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-16">
          <span className="material-symbols-outlined text-4xl animate-spin text-primary">refresh</span>
        </div>
      )}

      {classId && !loading && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Aulas', value: lessons.length, color: 'text-slate-700' },
              { label: 'Alunos', value: studentStats.length, color: 'text-slate-700' },
              { label: 'Freq. Média', value: `${overallPct}%`, color: freqColor(overallPct) },
              { label: 'Com Faltas', value: studentStats.filter(s => s.absent >= 2).length, color: 'text-red-600' },
            ].map(c => (
              <div key={c.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{c.label}</p>
                <p className={`text-3xl font-black mt-1 ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>

          {/* Student table */}
          {filtered.length > 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-800 dark:text-white">Presença por Aluno</h3>
                <p className="text-xs text-slate-400 mt-0.5">Clique no aluno para ver o relatório detalhado dia a dia</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      {['Aluno', 'Presenças', 'Faltas', 'Justificadas', 'Frequência', ''].map((h, i) => (
                        <th key={i} className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filtered.map(s => (
                      <tr key={s.student.id} onClick={() => setDetailStudent(s)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors">
                        <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-white">{s.student.name}</td>
                        <td className="px-5 py-3.5"><span className="font-bold text-emerald-600">{s.present}</span><span className="text-slate-400 text-xs">/{s.total}</span></td>
                        <td className="px-5 py-3.5">
                          <span className={cls('font-bold', s.absent >= 2 ? 'text-red-600' : 'text-slate-600')}>{s.absent}</span>
                          {s.absent >= 2 && <span className="ml-1.5 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">Limite</span>}
                        </td>
                        <td className="px-5 py-3.5 font-bold text-amber-600">{s.excused}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className={cls('h-full rounded-full', s.percentage >= 75 ? 'bg-emerald-500' : s.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500')}
                                style={{ width: `${s.percentage}%` }} />
                            </div>
                            <span className={cls('font-bold text-sm', freqColor(s.percentage))}>{s.percentage}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : classId && (
            <div className="text-center py-12 text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2">event_busy</span>
              <p>Nenhum dado encontrado</p>
            </div>
          )}

          {/* Lessons table */}
          {lessons.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-800 dark:text-white">Histórico de Aulas</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      {['Data', 'Disciplina', 'Horário', 'Presentes', ''].map((h, i) => (
                        <th key={i} className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {lessons.map(l => {
                      const present = l.attendances.filter(a => a.status === 'PRESENT').length;
                      const total = l.attendances.length;
                      return (
                        <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="px-5 py-3.5 font-medium">{new Date(l.date).toLocaleDateString('pt-BR')}</td>
                          <td className="px-5 py-3.5 text-sm text-slate-500">{l.disciplineName || '—'}</td>
                          <td className="px-5 py-3.5 text-sm text-slate-500">
                            {l.startTime ? new Date(l.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--'}
                            {' – '}
                            {l.endTime ? new Date(l.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--'}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="font-bold text-emerald-600">{present}</span>
                            <span className="text-slate-400 text-xs">/{total}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <Link href={`/aulas/${l.id}/presenca`} onClick={e => e.stopPropagation()}
                              className="text-xs text-primary font-bold hover:underline">Ver →</Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detalhe do aluno */}
      {detailStudent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={() => setDetailStudent(null)}>
          <div className="bg-white dark:bg-slate-900 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">{detailStudent.student.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{className}{periodLabel ? ` · ${periodLabel}` : ''}</p>
              </div>
              <button onClick={() => setDetailStudent(null)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal summary */}
            <div className="grid grid-cols-4 gap-2 p-4 border-b border-slate-100 dark:border-slate-800">
              {[
                { label: 'Aulas', value: detailStudent.total, color: 'text-slate-700 dark:text-white' },
                { label: 'Presenças', value: detailStudent.present, color: 'text-emerald-600' },
                { label: 'Faltas', value: detailStudent.absent, color: 'text-red-600' },
                { label: 'Justif.', value: detailStudent.excused, color: 'text-amber-600' },
              ].map(c => (
                <div key={c.label} className="text-center">
                  <p className={`text-2xl font-black ${c.color}`}>{c.value}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{c.label}</p>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Frequência</span>
              <span className={cls('text-xl font-black', freqColor(detailStudent.percentage))}>{detailStudent.percentage}%</span>
            </div>

            {/* Day-by-day list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {studentDays.length === 0 && (
                <p className="text-center text-slate-400 py-8 text-sm">Nenhuma aula registrada no período</p>
              )}
              {studentDays.map((d, i) => {
                const ui = STATUS_UI[d.status] ?? STATUS_UI.PENDING;
                return (
                  <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div>
                      <p className="font-semibold text-sm text-slate-800 dark:text-white">
                        {new Date(d.date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>
                      {d.disciplineName && <p className="text-xs text-slate-400 mt-0.5">{d.disciplineName}</p>}
                    </div>
                    <span className={cls('flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full', ui.cls)}>
                      <span className="material-symbols-outlined text-sm">{ui.icon}</span>
                      {ui.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Modal actions */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800">
              <button onClick={handleExportStudent}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-all">
                <span className="material-symbols-outlined text-base">smartphone</span>
                Exportar para celular (HTML / PDF)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
