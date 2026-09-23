import { exportReportPDF, REPORT_COLORS } from './pdf/reportPDF';

export interface EventRegistrationPDFRow {
  name: string;
  cpf: string;
  birthDate: string;
  eventTitle: string;
  ticketName: string;
  status: string;
}

export interface EventRegistrationPDFData {
  generatedAt: Date;
  filters: {
    eventTitle: string;
    status: string;
    search: string;
  };
  stats: {
    total: number;
    confirmed: number;
    pending: number;
    canceled: number;
  };
  rows: EventRegistrationPDFRow[];
}

export async function exportEventRegistrationsReportPDF(data: EventRegistrationPDFData): Promise<void> {
  await exportReportPDF({
    title: 'Relatório de Inscritos em Eventos',
    fileName: 'relatorio-inscritos-eventos',
    orientation: 'landscape',
    generatedAt: data.generatedAt,
    filters: [
      { label: 'Evento', value: data.filters.eventTitle },
      { label: 'Situação', value: data.filters.status },
      { label: 'Busca', value: data.filters.search },
    ],
    metrics: [
      { label: 'Total', value: data.stats.total, color: REPORT_COLORS.slate },
      { label: 'Confirmadas', value: data.stats.confirmed, color: REPORT_COLORS.green },
      { label: 'Pendentes', value: data.stats.pending, color: REPORT_COLORS.amber },
      { label: 'Canceladas', value: data.stats.canceled, color: REPORT_COLORS.red },
    ],
    sections: [
      {
        kind: 'table',
        head: ['Nome Completo', 'CPF', 'Data de Nasc.', 'Evento', 'Lote', 'Situação'],
        body: data.rows.map((row) => [
          row.name,
          row.cpf,
          row.birthDate,
          row.eventTitle,
          row.ticketName,
          row.status,
        ]),
        columnStyles: {
          0: { cellWidth: 60 },
          1: { halign: 'center', cellWidth: 34 },
          2: { halign: 'center', cellWidth: 30 },
          3: { cellWidth: 62 },
          4: { cellWidth: 42 },
          5: { halign: 'center', cellWidth: 28 },
        },
      },
    ],
  });
}
