// Exportação em PDF do relatório de Avaliação do Professor, nas visões
// "por professor" e "por disciplina". Usa o layout padrão de relatórios.
import { exportReportPDF, REPORT_COLORS, type ReportFilter, type ReportSection } from './pdf/reportPDF';
import {
  CRITERIA,
  RATING_META,
  classLabel,
  formatDate,
  formatScore,
  scorePdfColor,
  summarize,
  type EvaluationRow,
} from '@/app/relatorios/avaliacoes/shared';

export interface EvaluationPDFGroup {
  title: string;
  subtitle?: string;
  rows: EvaluationRow[];
}

export interface EvaluationPDFData {
  mode: 'teacher' | 'discipline';
  generatedAt?: Date;
  filters: ReportFilter[];
  groups: EvaluationPDFGroup[];
}

const participationLabel = (row: EvaluationRow) =>
  row.participationPct === null
    ? `${row.respondents} resp.`
    : `${row.participationPct}% (${row.respondents}/${row.eligible})`;

export async function exportEvaluationReportPDF(data: EvaluationPDFData): Promise<void> {
  const byTeacher = data.mode === 'teacher';
  const allRows = data.groups.flatMap(group => group.rows);
  const overall = summarize(allRows);

  const sections: ReportSection[] = [];

  if (data.groups.length > 1) {
    sections.push({
      kind: 'table',
      title: byTeacher ? 'Resumo por professor' : 'Resumo por disciplina',
      head: [
        byTeacher ? 'Professor' : 'Disciplina',
        byTeacher ? 'Disciplinas' : 'Professores',
        'Avaliações',
        'Participação',
        'Clareza',
        'Engajamento',
        'Domínio',
        'Nota geral',
      ],
      body: data.groups.map(group => {
        const stats = summarize(group.rows);
        return [
          group.title,
          byTeacher ? stats.disciplines : stats.teachers,
          stats.evaluations,
          stats.participationPct === null ? '—' : `${stats.participationPct}%`,
          formatScore(stats.criteria.clarity),
          formatScore(stats.criteria.engagement),
          formatScore(stats.criteria.mastery),
          formatScore(stats.overallScore),
        ];
      }),
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'center' },
        7: { halign: 'center', fontStyle: 'bold' },
      },
    });
  }

  data.groups.forEach(group => {
    const stats = summarize(group.rows);

    sections.push({ kind: 'heading', title: group.title, subtitle: group.subtitle });
    sections.push({
      kind: 'metrics',
      metrics: [
        {
          label: byTeacher ? 'Disciplinas' : 'Professores',
          value: byTeacher ? stats.disciplines : stats.teachers,
          color: REPORT_COLORS.slate,
        },
        { label: 'Avaliações', value: stats.evaluations, color: REPORT_COLORS.violet },
        {
          label: 'Participação',
          value: stats.participationPct === null ? '—' : `${stats.participationPct}%`,
          color: REPORT_COLORS.blue,
        },
        { label: 'Clareza', value: formatScore(stats.criteria.clarity), color: scorePdfColor(stats.criteria.clarity) },
        { label: 'Engajamento', value: formatScore(stats.criteria.engagement), color: scorePdfColor(stats.criteria.engagement) },
        { label: 'Domínio', value: formatScore(stats.criteria.mastery), color: scorePdfColor(stats.criteria.mastery) },
        { label: 'Nota geral', value: formatScore(stats.overallScore), color: scorePdfColor(stats.overallScore) },
      ],
    });

    if (group.rows.length > 1) {
      sections.push({
        kind: 'table',
        title: byTeacher ? 'Disciplinas avaliadas' : 'Professores avaliados',
        head: [
          byTeacher ? 'Disciplina' : 'Professor',
          'Turmas',
          'Ano',
          'Avaliações',
          'Participação',
          'Clareza',
          'Engajamento',
          'Domínio',
          'Nota geral',
        ],
        body: group.rows.map(row => [
          byTeacher ? row.disciplineName : row.teacherName,
          classLabel(row),
          row.year ?? '—',
          row.count,
          participationLabel(row),
          formatScore(row.scores.clarity),
          formatScore(row.scores.engagement),
          formatScore(row.scores.mastery),
          formatScore(row.overallScore),
        ]),
        columnStyles: {
          2: { halign: 'center' },
          3: { halign: 'center' },
          4: { halign: 'center' },
          5: { halign: 'center' },
          6: { halign: 'center' },
          7: { halign: 'center' },
          8: { halign: 'center', fontStyle: 'bold' },
        },
      });
    }

    group.rows.forEach(row => {
      const detailTitle = byTeacher
        ? `${row.disciplineName}${row.year ? ` — ${row.year}` : ''}`
        : `${row.teacherName}${row.year ? ` — ${row.year}` : ''}`;

      sections.push({ kind: 'subheading', title: `Detalhe: ${detailTitle}` });
      sections.push({
        kind: 'keyValues',
        items: [
          byTeacher
            ? { label: 'Professor', value: row.teacherName }
            : { label: 'Disciplina', value: row.disciplineName },
          { label: 'Turmas', value: classLabel(row) },
          { label: 'Carga horária', value: row.workload ? `${row.workload}h` : '—' },
          { label: 'Aulas', value: row.lessonCount },
          { label: 'Liberada', value: row.released ? 'Sim' : 'Não' },
          { label: 'Respondentes', value: `${row.respondents} de ${row.eligible}` },
          { label: 'Período', value: `${formatDate(row.firstEvaluationAt)} a ${formatDate(row.lastEvaluationAt)}` },
          { label: 'Nota geral', value: formatScore(row.overallScore) },
        ],
      });

      if (row.count === 0) {
        sections.push({ kind: 'notes', items: [], emptyLabel: 'Nenhuma avaliação recebida para este registro.' });
        return;
      }

      sections.push({
        kind: 'bars',
        bars: CRITERIA.map(criterion => ({
          label: criterion.label,
          total: row.count,
          note: `Nota ${formatScore(row.scores[criterion.key])} - ${row.count} resposta(s)`,
          segments: RATING_META.map(meta => ({
            label: meta.label,
            value: row[criterion.key][meta.key],
            color: meta.pdf,
          })),
        })),
      });

      sections.push({
        kind: 'notes',
        title: `Observações (${row.comments.length})`,
        items: row.comments.map(comment => ({
          text: comment.text,
          meta: formatDate(comment.date),
        })),
        emptyLabel: 'Nenhuma observação registrada.',
      });
    });
  });

  await exportReportPDF({
    title: 'Avaliação do Professor',
    subtitle: byTeacher ? 'Detalhamento por professor' : 'Detalhamento por disciplina',
    fileName: byTeacher ? 'relatorio-avaliacao-por-professor' : 'relatorio-avaliacao-por-disciplina',
    generatedAt: data.generatedAt,
    filters: data.filters,
    metrics: [
      { label: byTeacher ? 'Professores' : 'Disciplinas', value: data.groups.length, color: REPORT_COLORS.slate },
      { label: 'Avaliações', value: overall.evaluations, color: REPORT_COLORS.violet },
      {
        label: 'Participação',
        value: overall.participationPct === null ? '—' : `${overall.participationPct}%`,
        color: REPORT_COLORS.blue,
      },
      { label: 'Nota geral', value: formatScore(overall.overallScore), color: scorePdfColor(overall.overallScore) },
      { label: 'Observações', value: overall.comments, color: REPORT_COLORS.amber },
    ],
    sections,
  });
}
