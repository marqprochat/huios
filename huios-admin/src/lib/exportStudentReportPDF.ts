import { exportReportPDF, REPORT_COLORS } from './pdf/reportPDF';

export interface StudentReportPDFRow {
  studentName: string;
  className: string;
  modality: string;
  status: string;
  avgGrade: string;
  frequency: string;
  absences: number;
}

export interface StudentReportPDFData {
  generatedAt: Date;
  filters: {
    className: string;
    status: string;
    modality: string;
    search: string;
  };
  stats: {
    total: number;
    cursando: number;
    aprovado: number;
    reprovado: number;
  };
  rows: StudentReportPDFRow[];
}

export async function exportStudentReportPDF(data: StudentReportPDFData): Promise<void> {
  await exportReportPDF({
    title: 'Relatório de Alunos',
    fileName: 'relatorio-alunos',
    generatedAt: data.generatedAt,
    filters: [
      { label: 'Turma', value: data.filters.className },
      { label: 'Situação', value: data.filters.status },
      { label: 'Modalidade', value: data.filters.modality },
      { label: 'Busca', value: data.filters.search },
    ],
    metrics: [
      { label: 'Total', value: data.stats.total, color: REPORT_COLORS.slate },
      { label: 'Cursando', value: data.stats.cursando, color: REPORT_COLORS.blue },
      { label: 'Aprovados', value: data.stats.aprovado, color: REPORT_COLORS.green },
      { label: 'Reprovados', value: data.stats.reprovado, color: REPORT_COLORS.red },
    ],
    sections: [
      {
        kind: 'table',
        head: ['Aluno', 'Turma', 'Modalidade', 'Situação', 'Média', 'Frequência', 'Faltas'],
        body: data.rows.map(row => [
          row.studentName,
          row.className,
          row.modality,
          row.status,
          row.avgGrade,
          row.frequency,
          row.absences,
        ]),
        columnStyles: {
          0: { cellWidth: 56 },
          1: { cellWidth: 52 },
          2: { cellWidth: 30 },
          3: { cellWidth: 34 },
          4: { halign: 'center', cellWidth: 22 },
          5: { halign: 'center', cellWidth: 28 },
          6: { halign: 'center', cellWidth: 18 },
        },
      },
    ],
  });
}
