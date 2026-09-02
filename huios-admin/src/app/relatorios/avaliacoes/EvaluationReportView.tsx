'use client';

// Visão compartilhada do relatório de Avaliação do Professor.
// mode="teacher"    -> agrupa por professor e detalha todas as disciplinas dele.
// mode="discipline" -> agrupa por disciplina e detalha cada professor que a lecionou.
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { exportEvaluationReportPDF } from '@/lib/exportEvaluationReportPDF';
import { exportCSV } from '@/lib/exportCSV';
import {
  CRITERIA,
  RATING_META,
  classLabel,
  disciplineKey,
  formatDate,
  formatScore,
  scoreTone,
  summarize,
  type EvaluationReportResponse,
  type EvaluationRow,
} from './shared';

interface Group {
  id: string;
  title: string;
  subtitle: string;
  rows: EvaluationRow[];
}

const inputClass =
  'w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/30';

export default function EvaluationReportView({ mode }: { mode: 'teacher' | 'discipline' }) {
  const byTeacher = mode === 'teacher';

  const [rows, setRows] = useState<EvaluationRow[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [selectedId, setSelectedId] = useState('');
  const [year, setYear] = useState('');
  const [search, setSearch] = useState('');
  const [onlyEvaluated, setOnlyEvaluated] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/relatorios/avaliacoes')
      .then(response => response.json())
      .then((data: EvaluationReportResponse) => {
        setRows(data.rows ?? []);
        setYears(data.years ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const visibleRows = useMemo(() => rows.filter(row => {
    if (onlyEvaluated && row.count === 0) return false;
    if (year && String(row.year ?? '') !== year) return false;
    if (search) {
      const term = search.toLowerCase();
      const haystack = `${row.teacherName} ${row.disciplineName} ${classLabel(row)}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  }), [rows, onlyEvaluated, year, search]);

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>();

    for (const row of visibleRows) {
      const id = byTeacher ? (row.teacherId ?? `sem-professor:${row.teacherName}`) : disciplineKey(row.disciplineName);
      const existing = map.get(id);
      if (existing) existing.rows.push(row);
      else map.set(id, { id, title: byTeacher ? row.teacherName : row.disciplineName, subtitle: '', rows: [row] });
    }

    return [...map.values()]
      .map(group => {
        const stats = summarize(group.rows);
        const subtitle = byTeacher
          ? `${stats.disciplines} disciplina(s) - ${stats.evaluations} avaliação(ões) - nota geral ${formatScore(stats.overallScore)}`
          : `${stats.teachers} professor(es) - ${stats.evaluations} avaliação(ões) - nota geral ${formatScore(stats.overallScore)}`;
        return { ...group, subtitle };
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [visibleRows, byTeacher]);

  const selectedGroups = useMemo(
    () => (selectedId ? groups.filter(group => group.id === selectedId) : groups),
    [groups, selectedId],
  );

  const overall = useMemo(
    () => summarize(selectedGroups.flatMap(group => group.rows)),
    [selectedGroups],
  );

  const currentFilters = () => [
    { label: byTeacher ? 'Professor' : 'Disciplina', value: selectedId ? (selectedGroups[0]?.title ?? '—') : 'Todos' },
    { label: 'Ano letivo', value: year || 'Todos' },
    { label: 'Busca', value: search.trim() || 'Não informada' },
    { label: 'Somente avaliados', value: onlyEvaluated ? 'Sim' : 'Não' },
  ];

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      await exportEvaluationReportPDF({
        mode,
        generatedAt: new Date(),
        filters: currentFilters(),
        groups: selectedGroups.map(group => ({
          title: group.title,
          subtitle: group.subtitle,
          rows: group.rows,
        })),
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = () => {
    exportCSV(
      byTeacher ? 'avaliacao-por-professor' : 'avaliacao-por-disciplina',
      ['Professor', 'Disciplina', 'Ano', 'Turmas', 'Avaliações', 'Elegíveis', 'Respondentes', 'Participação %', 'Clareza', 'Engajamento', 'Domínio', 'Nota geral', 'Observações'],
      selectedGroups.flatMap(group => group.rows).map(row => [
        row.teacherName,
        row.disciplineName,
        row.year ?? '—',
        classLabel(row),
        row.count,
        row.eligible,
        row.respondents,
        row.participationPct ?? '—',
        formatScore(row.scores.clarity),
        formatScore(row.scores.engagement),
        formatScore(row.scores.mastery),
        formatScore(row.overallScore),
        row.comments.length,
      ]),
    );
  };

  const title = byTeacher ? 'Avaliação por Professor' : 'Avaliação por Disciplina';
  const description = byTeacher
    ? 'Todas as disciplinas avaliadas de cada professor, com notas por critério e observações'
    : 'Cada disciplina detalhada com a avaliação de todos os professores que a lecionaram';

  return (
    <div className="max-w-[1600px] mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/relatorios/avaliacoes" className="text-slate-400 hover:text-primary transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{title}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{description}</p>
          </div>
        </div>
        {selectedGroups.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              <span className="material-symbols-outlined text-sm">download</span>Exportar CSV
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-all disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
              {exporting ? 'Gerando PDF...' : 'Exportar PDF'}
            </button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">{byTeacher ? 'Professor' : 'Disciplina'}</label>
            <select value={selectedId} onChange={event => setSelectedId(event.target.value)} className={inputClass}>
              <option value="">Todos</option>
              {groups.map(group => <option key={group.id} value={group.id}>{group.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Ano letivo</label>
            <select value={year} onChange={event => setYear(event.target.value)} className={inputClass}>
              <option value="">Todos</option>
              {years.map(item => <option key={item} value={String(item)}>{item}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Buscar</label>
            <input
              type="text"
              placeholder="Professor, disciplina ou turma..."
              value={search}
              onChange={event => setSearch(event.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 pb-2.5">
              <input
                type="checkbox"
                checked={onlyEvaluated}
                onChange={event => setOnlyEvaluated(event.target.checked)}
                className="size-4 rounded border-slate-300 text-primary focus:ring-primary/30"
              />
              Somente com avaliações
            </label>
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: byTeacher ? 'Professores' : 'Disciplinas', value: selectedGroups.length, tone: 'text-slate-700 dark:text-slate-200' },
          { label: 'Avaliações', value: overall.evaluations, tone: 'text-violet-600' },
          { label: 'Participação', value: overall.participationPct === null ? '—' : `${overall.participationPct}%`, tone: 'text-blue-600' },
          { label: 'Nota geral', value: formatScore(overall.overallScore), tone: scoreTone(overall.overallScore) },
          { label: 'Observações', value: overall.comments, tone: 'text-amber-600' },
        ].map(card => (
          <div key={card.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.label}</p>
            <p className={`text-3xl font-black mt-1 ${card.tone}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16">
          <span className="material-symbols-outlined text-4xl animate-spin text-primary">refresh</span>
        </div>
      ) : selectedGroups.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <span className="material-symbols-outlined text-5xl mb-3">rate_review</span>
          <p>Nenhuma avaliação encontrada com os filtros selecionados</p>
        </div>
      ) : (
        <div className="space-y-5">
          {selectedGroups.map(group => {
            const stats = summarize(group.rows);
            const open = expanded === group.id || selectedGroups.length === 1;

            return (
              <div key={group.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <button
                  onClick={() => setExpanded(open && selectedGroups.length > 1 ? null : group.id)}
                  className="w-full text-left p-6 flex items-start justify-between gap-4 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <div className="min-w-0">
                    <h3 className="font-black text-lg text-slate-800 dark:text-white truncate">{group.title}</h3>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">{group.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nota geral</p>
                      <p className={`text-2xl font-black ${scoreTone(stats.overallScore)}`}>{formatScore(stats.overallScore)}</p>
                    </div>
                    {selectedGroups.length > 1 && (
                      <span className={`material-symbols-outlined text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>expand_more</span>
                    )}
                  </div>
                </button>

                {open && (
                  <div className="p-6 space-y-6">
                    {/* Critérios consolidados do grupo */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {CRITERIA.map(criterion => (
                        <div key={criterion.key} className="rounded-xl border border-slate-100 dark:border-slate-800 p-4">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{criterion.label}</p>
                          <p className={`text-2xl font-black mt-1 ${scoreTone(stats.criteria[criterion.key])}`}>
                            {formatScore(stats.criteria[criterion.key])}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Detalhe individual */}
                    {group.rows.map(row => (
                      <div key={row.disciplineId} className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-800 dark:text-white">
                              {byTeacher ? row.disciplineName : row.teacherName}
                              {row.year ? <span className="text-slate-400 font-semibold"> — {row.year}</span> : null}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {byTeacher ? `Professor: ${row.teacherName}` : `Disciplina: ${row.disciplineName}`} • Turmas: {classLabel(row)}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              {row.count} avaliação(ões) • {row.respondents} de {row.eligible} aluno(s)
                              {row.participationPct !== null ? ` (${row.participationPct}%)` : ''} •{' '}
                              {row.workload ? `${row.workload}h` : 'carga horária não informada'} • {row.lessonCount} aula(s) •{' '}
                              {row.released ? 'avaliação liberada' : 'avaliação não liberada'}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Período: {formatDate(row.firstEvaluationAt)} a {formatDate(row.lastEvaluationAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nota</p>
                            <p className={`text-2xl font-black ${scoreTone(row.overallScore)}`}>{formatScore(row.overallScore)}</p>
                          </div>
                        </div>

                        {row.count === 0 ? (
                          <p className="p-5 text-sm italic text-slate-400">Nenhuma avaliação recebida para este registro.</p>
                        ) : (
                          <div className="p-5 space-y-5">
                            {CRITERIA.map(criterion => (
                              <div key={criterion.key} className="space-y-2">
                                <div className="flex items-center justify-between gap-3">
                                  <h5 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                    {criterion.label}
                                  </h5>
                                  <span className={`text-xs font-black ${scoreTone(row.scores[criterion.key])}`}>
                                    {formatScore(row.scores[criterion.key])}
                                  </span>
                                </div>
                                <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                                  {RATING_META.map(meta => {
                                    const count = row[criterion.key][meta.key];
                                    if (count === 0) return null;
                                    return (
                                      <div
                                        key={meta.key}
                                        className={meta.bar}
                                        style={{ width: `${(count / row.count) * 100}%` }}
                                        title={`${meta.label}: ${count}`}
                                      />
                                    );
                                  })}
                                </div>
                                <div className="flex flex-wrap gap-x-3 gap-y-1">
                                  {RATING_META.map(meta => {
                                    const count = row[criterion.key][meta.key];
                                    if (count === 0) return null;
                                    return (
                                      <div key={meta.key} className="flex items-center gap-1.5">
                                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                          {meta.label}: {count} ({Math.round((count / row.count) * 100)}%)
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}

                            <div>
                              <h5 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                                Observações ({row.comments.length})
                              </h5>
                              {row.comments.length === 0 ? (
                                <p className="text-sm italic text-slate-400">Nenhuma observação registrada.</p>
                              ) : (
                                <div className="space-y-2">
                                  {row.comments.map((comment, index) => (
                                    <div key={index} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                      <p className="text-sm italic text-slate-700 dark:text-slate-200 leading-relaxed">&quot;{comment.text}&quot;</p>
                                      <p className="text-[10px] font-bold text-slate-400 text-right mt-1">{formatDate(comment.date)}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
