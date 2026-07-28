import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

const cleanText = (value: string | number) => String(value).replace(/[\u0000-\u001F\u007F]/g, ' ').trim();

const loadLogo = (): Promise<string | null> => new Promise(resolve => {
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');

    if (!context) {
      resolve(null);
      return;
    }

    context.drawImage(image, 0, 0);
    resolve(canvas.toDataURL('image/png'));
  };
  image.onerror = () => resolve(null);
  image.src = '/logo.png';
});

const formatDateTime = (date: Date) => date.toLocaleString('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const formatFileDate = (date: Date) => date.toISOString().slice(0, 10);

export async function exportStudentReportPDF(data: StudentReportPDFData): Promise<void> {
  const document = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = document.internal.pageSize.getWidth();
  const logo = await loadLogo();

  document.setFillColor(15, 23, 42);
  document.rect(0, 0, pageWidth, 32, 'F');

  if (logo) {
    document.addImage(logo, 'PNG', 14, 7, 34, 18);
  }

  document.setTextColor(255, 255, 255);
  document.setFont('helvetica', 'bold');
  document.setFontSize(18);
  document.text('Relatório de Alunos', logo ? 54 : 14, 15);
  document.setFont('helvetica', 'normal');
  document.setFontSize(9);
  document.text(`Gerado em ${formatDateTime(data.generatedAt)}`, logo ? 54 : 14, 22);

  document.setTextColor(51, 65, 85);
  document.setFont('helvetica', 'bold');
  document.setFontSize(9);
  document.text('FILTROS APLICADOS', 14, 42);
  document.setFont('helvetica', 'normal');
  document.setFontSize(8.5);
  document.text([
    `Turma: ${cleanText(data.filters.className)}`,
    `Situação: ${cleanText(data.filters.status)}`,
    `Modalidade: ${cleanText(data.filters.modality)}`,
    `Busca: ${cleanText(data.filters.search)}`,
  ].join('   |   '), 14, 48);

  const metrics = [
    ['Total', data.stats.total, [51, 65, 85]],
    ['Cursando', data.stats.cursando, [37, 99, 235]],
    ['Aprovados', data.stats.aprovado, [5, 150, 105]],
    ['Reprovados', data.stats.reprovado, [220, 38, 38]],
  ] as const;
  const metricWidth = (pageWidth - 28 - 9) / metrics.length;

  metrics.forEach(([label, value, color], index) => {
    const x = 14 + index * (metricWidth + 3);
    document.setFillColor(248, 250, 252);
    document.roundedRect(x, 55, metricWidth, 19, 2, 2, 'F');
    document.setTextColor(color[0], color[1], color[2]);
    document.setFont('helvetica', 'bold');
    document.setFontSize(15);
    document.text(String(value), x + 4, 64);
    document.setTextColor(100, 116, 139);
    document.setFontSize(7.5);
    document.text(label.toUpperCase(), x + 4, 70);
  });

  autoTable(document, {
    startY: 82,
    margin: { left: 14, right: 14, bottom: 16 },
    head: [['Aluno', 'Turma', 'Modalidade', 'Situação', 'Média', 'Frequência', 'Faltas']],
    body: data.rows.map(row => [
      cleanText(row.studentName),
      cleanText(row.className),
      cleanText(row.modality),
      cleanText(row.status),
      cleanText(row.avgGrade),
      cleanText(row.frequency),
      String(row.absences),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 56 },
      1: { cellWidth: 52 },
      2: { cellWidth: 30 },
      3: { cellWidth: 34 },
      4: { halign: 'center', cellWidth: 22 },
      5: { halign: 'center', cellWidth: 28 },
      6: { halign: 'center', cellWidth: 18 },
    },
    didDrawPage: () => {
      const pageHeight = document.internal.pageSize.getHeight();
      const pageNumber = document.getCurrentPageInfo().pageNumber;
      document.setDrawColor(226, 232, 240);
      document.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);
      document.setTextColor(100, 116, 139);
      document.setFontSize(7.5);
      document.text('HUIOS', 14, pageHeight - 5);
      document.text(`Página ${pageNumber}`, pageWidth - 14, pageHeight - 5, { align: 'right' });
    },
  });

  document.save(`relatorio-alunos-${formatFileDate(data.generatedAt)}.pdf`);
}
