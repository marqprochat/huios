// Tipos e utilitários compartilhados pelos relatórios de Avaliação do Professor
// (visões "por professor" e "por disciplina").
import { REPORT_COLORS, type RGB } from '@/lib/pdf/reportPDF';

export const RATING_KEYS = ['EXCELENTE', 'BOA', 'REGULAR', 'RUIM'] as const;
export type RatingKey = (typeof RATING_KEYS)[number];
export type RatingCounts = Record<RatingKey, number>;

export interface EvaluationClass {
  id: string;
  name: string;
  courseName: string;
}

export interface EvaluationComment {
  text: string;
  date: string;
}

export interface EvaluationRow {
  disciplineId: string;
  disciplineName: string;
  year: number | null;
  workload: number | null;
  teacherId: string | null;
  teacherName: string;
  teacherEmail: string | null;
  teacherPhone: string | null;
  teacherCity: string | null;
  classes: EvaluationClass[];
  lessonCount: number;
  released: boolean;
  count: number;
  eligible: number;
  respondents: number;
  participationPct: number | null;
  clarity: RatingCounts;
  engagement: RatingCounts;
  mastery: RatingCounts;
  scores: { clarity: number | null; engagement: number | null; mastery: number | null };
  overallScore: number | null;
  firstEvaluationAt: string | null;
  lastEvaluationAt: string | null;
  comments: EvaluationComment[];
}

export interface EvaluationReportResponse {
  rows: EvaluationRow[];
  teachers: { id: string; name: string }[];
  years: number[];
}

export const RATING_META: { key: RatingKey; label: string; bar: string; dot: string; chip: string; pdf: RGB }[] = [
  { key: 'EXCELENTE', label: 'Excelente', bar: 'bg-emerald-500', dot: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-700', pdf: REPORT_COLORS.green },
  { key: 'BOA', label: 'Boa', bar: 'bg-blue-500', dot: 'bg-blue-500', chip: 'bg-blue-100 text-blue-700', pdf: REPORT_COLORS.blue },
  { key: 'REGULAR', label: 'Regular', bar: 'bg-amber-500', dot: 'bg-amber-500', chip: 'bg-amber-100 text-amber-700', pdf: REPORT_COLORS.amber },
  { key: 'RUIM', label: 'Ruim', bar: 'bg-red-500', dot: 'bg-red-500', chip: 'bg-red-100 text-red-700', pdf: REPORT_COLORS.red },
];

export const CRITERIA: { key: 'clarity' | 'engagement' | 'mastery'; label: string }[] = [
  { key: 'clarity', label: 'Clareza da explicação' },
  { key: 'engagement', label: 'Engajamento e metodologia' },
  { key: 'mastery', label: 'Domínio do conteúdo' },
];

export const scoreTone = (score: number | null) =>
  score === null ? 'text-slate-300'
    : score >= 8.5 ? 'text-emerald-600'
      : score >= 7 ? 'text-blue-600'
        : score >= 5 ? 'text-amber-600'
          : 'text-red-600';

export const scorePdfColor = (score: number | null): RGB =>
  score === null ? REPORT_COLORS.muted
    : score >= 8.5 ? REPORT_COLORS.green
      : score >= 7 ? REPORT_COLORS.blue
        : score >= 5 ? REPORT_COLORS.amber
          : REPORT_COLORS.red;

export const formatScore = (score: number | null) => (score === null ? '—' : score.toFixed(1));

export const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('pt-BR') : '—';

export const classLabel = (row: EvaluationRow) =>
  row.classes.length ? row.classes.map(item => `${item.name} (${item.courseName})`).join(', ') : '—';

/** Normaliza o nome da disciplina para agrupar registros de anos/turmas diferentes. */
export const disciplineKey = (name: string) =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

export interface EvaluationSummary {
  disciplines: number;
  teachers: number;
  evaluations: number;
  eligible: number;
  respondents: number;
  participationPct: number | null;
  overallScore: number | null;
  criteria: { clarity: number | null; engagement: number | null; mastery: number | null };
  ratings: RatingCounts;
  comments: number;
}

const RATING_SCORE: Record<RatingKey, number> = { EXCELENTE: 10, BOA: 7.5, REGULAR: 5, RUIM: 2.5 };

const mergeCounts = (rows: EvaluationRow[], field: 'clarity' | 'engagement' | 'mastery'): RatingCounts => {
  const total: RatingCounts = { EXCELENTE: 0, BOA: 0, REGULAR: 0, RUIM: 0 };
  for (const row of rows) {
    for (const key of RATING_KEYS) total[key] += row[field][key];
  }
  return total;
};

const averageOf = (counts: RatingCounts) => {
  const total = RATING_KEYS.reduce((acc, key) => acc + counts[key], 0);
  if (total === 0) return null;
  const sum = RATING_KEYS.reduce((acc, key) => acc + counts[key] * RATING_SCORE[key], 0);
  return Math.round((sum / total) * 10) / 10;
};

export const combinedCounts = (rows: EvaluationRow[]): RatingCounts => {
  const all: RatingCounts = { EXCELENTE: 0, BOA: 0, REGULAR: 0, RUIM: 0 };
  for (const field of ['clarity', 'engagement', 'mastery'] as const) {
    const counts = mergeCounts(rows, field);
    for (const key of RATING_KEYS) all[key] += counts[key];
  }
  return all;
};

export const summarize = (rows: EvaluationRow[]): EvaluationSummary => {
  const evaluations = rows.reduce((acc, row) => acc + row.count, 0);
  const eligible = rows.reduce((acc, row) => acc + row.eligible, 0);
  const respondents = rows.reduce((acc, row) => acc + row.respondents, 0);
  const criteria = {
    clarity: averageOf(mergeCounts(rows, 'clarity')),
    engagement: averageOf(mergeCounts(rows, 'engagement')),
    mastery: averageOf(mergeCounts(rows, 'mastery')),
  };
  const defined = Object.values(criteria).filter((value): value is number => value !== null);

  return {
    disciplines: new Set(rows.map(row => row.disciplineId)).size,
    teachers: new Set(rows.map(row => row.teacherId ?? row.teacherName)).size,
    evaluations,
    eligible,
    respondents,
    participationPct: eligible > 0 ? Math.round((respondents / eligible) * 100) : null,
    overallScore: defined.length
      ? Math.round((defined.reduce((acc, value) => acc + value, 0) / defined.length) * 10) / 10
      : null,
    criteria,
    ratings: combinedCounts(rows),
    comments: rows.reduce((acc, row) => acc + row.comments.length, 0),
  };
};
