// Exportador de PDF padronizado para todos os relatórios do HUIOS.
// Mantém cabeçalho com logo, faixa de filtros, cartões de métricas, tabelas,
// blocos de barras e observações, além de rodapé numerado em todas as páginas.
import { jsPDF } from 'jspdf';
import autoTable, { type UserOptions } from 'jspdf-autotable';

export type RGB = readonly [number, number, number];

export interface ReportFilter {
  label: string;
  value: string | number | null | undefined;
}

export interface ReportMetric {
  label: string;
  value: string | number;
  color?: RGB;
}

export interface ReportBarSegment {
  label: string;
  value: number;
  color: RGB;
}

export interface ReportBar {
  label: string;
  total: number;
  segments: ReportBarSegment[];
  note?: string;
}

export interface ReportNote {
  text: string;
  meta?: string;
}

export type ReportSection =
  | { kind: 'heading'; title: string; subtitle?: string }
  | { kind: 'subheading'; title: string }
  | { kind: 'metrics'; metrics: ReportMetric[] }
  | { kind: 'keyValues'; items: ReportFilter[] }
  | {
      kind: 'table';
      title?: string;
      head: string[];
      body: (string | number | null | undefined)[][];
      columnStyles?: UserOptions['columnStyles'];
      fontSize?: number;
    }
  | { kind: 'bars'; title?: string; bars: ReportBar[] }
  | { kind: 'notes'; title?: string; items: ReportNote[]; emptyLabel?: string }
  | { kind: 'spacer'; height?: number };

export interface ReportPDFOptions {
  /** Título exibido na faixa superior e no rodapé. */
  title: string;
  /** Linha de apoio abaixo do título. */
  subtitle?: string;
  /** Nome base do arquivo (a data é acrescentada automaticamente). */
  fileName: string;
  orientation?: 'portrait' | 'landscape';
  generatedAt?: Date;
  filters?: ReportFilter[];
  metrics?: ReportMetric[];
  sections?: ReportSection[];
}

export const REPORT_COLORS = {
  brand: [15, 23, 42] as RGB,
  tableHead: [30, 41, 59] as RGB,
  text: [30, 41, 59] as RGB,
  muted: [100, 116, 139] as RGB,
  line: [226, 232, 240] as RGB,
  surface: [248, 250, 252] as RGB,
  slate: [51, 65, 85] as RGB,
  blue: [37, 99, 235] as RGB,
  green: [5, 150, 105] as RGB,
  amber: [217, 119, 6] as RGB,
  red: [220, 38, 38] as RGB,
  violet: [124, 58, 237] as RGB,
} as const;

const MARGIN = 14;
const HEADER_HEIGHT = 32;
const FOOTER_SPACE = 16;
const TOP_AFTER_BREAK = 20;

const cleanText = (value: string | number | null | undefined) =>
  value === null || value === undefined
    ? '—'
    : String(value).replace(/[\u0000-\u001F\u007F]/g, ' ').trim() || '—';

const formatDateTime = (date: Date) =>
  date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

const formatFileDate = (date: Date) => date.toISOString().slice(0, 10);

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .toLowerCase() || 'relatorio';

interface LoadedLogo {
  dataUrl: string;
  width: number;
  height: number;
}

const loadLogo = (): Promise<LoadedLogo | null> =>
  new Promise(resolve => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }
    const image = new Image();
    image.onload = () => {
      const naturalWidth = image.naturalWidth || 1;
      const naturalHeight = image.naturalHeight || 1;
      const canvas = window.document.createElement('canvas');
      canvas.width = naturalWidth;
      canvas.height = naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) {
        resolve(null);
        return;
      }
      context.drawImage(image, 0, 0);
      resolve({
        dataUrl: canvas.toDataURL('image/png'),
        width: naturalWidth,
        height: naturalHeight,
      });
    };
    image.onerror = () => resolve(null);
    image.src = '/logo.png';
  });

export async function exportReportPDF(options: ReportPDFOptions): Promise<void> {
  const generatedAt = options.generatedAt ?? new Date();
  const doc = new jsPDF({
    orientation: options.orientation ?? 'landscape',
    unit: 'mm',
    format: 'a4',
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;
  const logo = await loadLogo();

  // --- Cabeçalho ---
  doc.setFillColor(...REPORT_COLORS.brand);
  doc.rect(0, 0, pageWidth, HEADER_HEIGHT, 'F');

  const maxLogoWidth = 28;
  const maxLogoHeight = 18;
  let logoRenderWidth = 0;
  let logoRenderHeight = 0;

  if (logo && logo.width > 0 && logo.height > 0) {
    const aspect = logo.width / logo.height;
    if (aspect > maxLogoWidth / maxLogoHeight) {
      logoRenderWidth = maxLogoWidth;
      logoRenderHeight = maxLogoWidth / aspect;
    } else {
      logoRenderHeight = maxLogoHeight;
      logoRenderWidth = maxLogoHeight * aspect;
    }
    const logoRenderY = 7 + (maxLogoHeight - logoRenderHeight) / 2;
    doc.addImage(logo.dataUrl, 'PNG', MARGIN, logoRenderY, logoRenderWidth, logoRenderHeight);
  }

  const headerX = logoRenderWidth > 0 ? MARGIN + logoRenderWidth + 6 : MARGIN;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(cleanText(options.title), headerX, options.subtitle ? 14 : 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (options.subtitle) {
    doc.text(cleanText(options.subtitle), headerX, 20);
    doc.text(`Gerado em ${formatDateTime(generatedAt)}`, headerX, 26);
  } else {
    doc.text(`Gerado em ${formatDateTime(generatedAt)}`, headerX, 23);
  }

  let y = HEADER_HEIGHT + 8;

  const ensureSpace = (needed: number) => {
    if (y + needed <= pageHeight - FOOTER_SPACE) return;
    doc.addPage();
    y = TOP_AFTER_BREAK;
  };

  const drawKeyValues = (items: ReportFilter[], label?: string) => {
    const visible = items.filter(item => item.label);
    if (visible.length === 0) return;
    const line = visible.map(item => `${item.label}: ${cleanText(item.value)}`).join('   |   ');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const wrapped = doc.splitTextToSize(line, contentWidth) as string[];
    ensureSpace(6 + wrapped.length * 4.5);
    if (label) {
      doc.setTextColor(...REPORT_COLORS.slate);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(label, MARGIN, y);
      y += 5.5;
    }
    doc.setTextColor(...REPORT_COLORS.slate);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(wrapped, MARGIN, y);
    y += wrapped.length * 4.5 + 4;
  };

  const drawMetrics = (metrics: ReportMetric[]) => {
    if (metrics.length === 0) return;
    ensureSpace(24);
    const gap = 3;
    const cardWidth = (contentWidth - gap * (metrics.length - 1)) / metrics.length;
    metrics.forEach((metric, index) => {
      const x = MARGIN + index * (cardWidth + gap);
      const color = metric.color ?? REPORT_COLORS.slate;
      doc.setFillColor(...REPORT_COLORS.surface);
      doc.roundedRect(x, y, cardWidth, 19, 2, 2, 'F');
      doc.setTextColor(...color);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text(String(metric.value), x + 4, y + 9);
      doc.setTextColor(...REPORT_COLORS.muted);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(metric.label.toUpperCase(), x + 4, y + 15);
    });
    y += 25;
  };

  const drawHeading = (title: string, subtitle?: string) => {
    const height = subtitle ? 15 : 10;
    ensureSpace(height + 6);
    doc.setFillColor(...REPORT_COLORS.surface);
    doc.roundedRect(MARGIN, y, contentWidth, height, 2, 2, 'F');
    doc.setTextColor(...REPORT_COLORS.brand);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(cleanText(title), MARGIN + 4, y + 7);
    if (subtitle) {
      doc.setTextColor(...REPORT_COLORS.muted);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(cleanText(subtitle), MARGIN + 4, y + 12);
    }
    y += height + 5;
  };

  const drawSubheading = (title: string) => {
    ensureSpace(9);
    doc.setTextColor(...REPORT_COLORS.slate);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(cleanText(title).toUpperCase(), MARGIN, y);
    y += 5.5;
  };

  const drawBars = (bars: ReportBar[]) => {
    bars.forEach(bar => {
      ensureSpace(20);
      doc.setTextColor(...REPORT_COLORS.slate);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(cleanText(bar.label), MARGIN, y);
      if (bar.note) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...REPORT_COLORS.muted);
        doc.text(cleanText(bar.note), pageWidth - MARGIN, y, { align: 'right' });
      }
      y += 2.5;

      doc.setFillColor(...REPORT_COLORS.line);
      doc.roundedRect(MARGIN, y, contentWidth, 4, 1, 1, 'F');
      if (bar.total > 0) {
        let cursorX = MARGIN;
        bar.segments.forEach(segment => {
          if (segment.value <= 0) return;
          const width = (segment.value / bar.total) * contentWidth;
          doc.setFillColor(...segment.color);
          doc.rect(cursorX, y, width, 4, 'F');
          cursorX += width;
        });
      }
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      let legendX = MARGIN;
      bar.segments.forEach(segment => {
        const pct = bar.total > 0 ? Math.round((segment.value / bar.total) * 100) : 0;
        const text = `${segment.label}: ${segment.value} (${pct}%)`;
        const width = doc.getTextWidth(text) + 8;
        if (legendX + width > pageWidth - MARGIN) {
          legendX = MARGIN;
          y += 4.5;
        }
        doc.setFillColor(...segment.color);
        doc.circle(legendX + 1, y - 1, 1, 'F');
        doc.setTextColor(...REPORT_COLORS.muted);
        doc.text(text, legendX + 3.5, y);
        legendX += width;
      });
      y += 7;
    });
  };

  const drawNotes = (items: ReportNote[], emptyLabel?: string) => {
    if (items.length === 0) {
      if (!emptyLabel) return;
      ensureSpace(8);
      doc.setTextColor(...REPORT_COLORS.muted);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.text(cleanText(emptyLabel), MARGIN, y);
      y += 7;
      return;
    }

    items.forEach(item => {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      const lines = doc.splitTextToSize(`"${cleanText(item.text)}"`, contentWidth - 8) as string[];
      const boxHeight = lines.length * 4.2 + (item.meta ? 9 : 5);
      ensureSpace(boxHeight + 3);
      doc.setFillColor(...REPORT_COLORS.surface);
      doc.roundedRect(MARGIN, y, contentWidth, boxHeight, 2, 2, 'F');
      doc.setTextColor(...REPORT_COLORS.text);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.text(lines, MARGIN + 4, y + 5);
      if (item.meta) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...REPORT_COLORS.muted);
        doc.text(cleanText(item.meta), pageWidth - MARGIN - 4, y + boxHeight - 3, { align: 'right' });
      }
      y += boxHeight + 3;
    });
    y += 3;
  };

  const drawTable = (section: Extract<ReportSection, { kind: 'table' }>) => {
    if (section.title) drawSubheading(section.title);
    ensureSpace(24);
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN, bottom: FOOTER_SPACE },
      head: [section.head],
      body: section.body.map(row => row.map(cell => cleanText(cell))),
      theme: 'grid',
      headStyles: {
        fillColor: [...REPORT_COLORS.tableHead] as [number, number, number],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [...REPORT_COLORS.surface] as [number, number, number] },
      styles: {
        font: 'helvetica',
        fontSize: section.fontSize ?? 8,
        cellPadding: 2.5,
        textColor: [...REPORT_COLORS.text] as [number, number, number],
        overflow: 'linebreak',
      },
      columnStyles: section.columnStyles,
    });
    const finalY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY;
    y = (finalY ?? y) + 8;
  };

  drawKeyValues(options.filters ?? [], options.filters?.length ? 'FILTROS APLICADOS' : undefined);
  drawMetrics(options.metrics ?? []);

  for (const section of options.sections ?? []) {
    switch (section.kind) {
      case 'heading':
        drawHeading(section.title, section.subtitle);
        break;
      case 'subheading':
        drawSubheading(section.title);
        break;
      case 'metrics':
        drawMetrics(section.metrics);
        break;
      case 'keyValues':
        drawKeyValues(section.items);
        break;
      case 'table':
        drawTable(section);
        break;
      case 'bars':
        if (section.title) drawSubheading(section.title);
        drawBars(section.bars);
        break;
      case 'notes':
        if (section.title) drawSubheading(section.title);
        drawNotes(section.items, section.emptyLabel);
        break;
      case 'spacer':
        y += section.height ?? 6;
        break;
    }
  }

  // --- Rodapé em todas as páginas ---
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...REPORT_COLORS.line);
    doc.line(MARGIN, pageHeight - 10, pageWidth - MARGIN, pageHeight - 10);
    doc.setTextColor(...REPORT_COLORS.muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('HUIOS', MARGIN, pageHeight - 5);
    doc.text(cleanText(options.title), pageWidth / 2, pageHeight - 5, { align: 'center' });
    doc.text(`Página ${page} de ${totalPages}`, pageWidth - MARGIN, pageHeight - 5, { align: 'right' });
  }

  doc.save(`${slugify(options.fileName)}-${formatFileDate(generatedAt)}.pdf`);
}
