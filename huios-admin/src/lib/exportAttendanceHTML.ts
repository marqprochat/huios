// Gera um relatório de presença de um aluno como arquivo HTML autônomo,
// responsivo e otimizado para celulares (Android e iOS). Pode ser aberto em
// qualquer navegador e salvo como PDF para compartilhar (ex.: WhatsApp).

export interface AttendanceDay {
  date: string;            // ISO
  disciplineName?: string;
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'PENDING';
}

export interface StudentAttendanceReport {
  studentName: string;
  className: string;
  periodLabel?: string;
  total: number;
  present: number;
  absent: number;
  excused: number;
  percentage: number;
  days: AttendanceDay[];
}

const STATUS = {
  PRESENT: { label: 'Presente', color: '#059669', bg: '#d1fae5', icon: '✓' },
  ABSENT: { label: 'Falta', color: '#dc2626', bg: '#fee2e2', icon: '✕' },
  EXCUSED: { label: 'Justificada', color: '#d97706', bg: '#fef3c7', icon: '!' },
  PENDING: { label: 'Pendente', color: '#64748b', bg: '#f1f5f9', icon: '–' },
};

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });

export function buildAttendanceHTML(r: StudentAttendanceReport): string {
  const freqColor = r.percentage >= 75 ? '#059669' : r.percentage >= 50 ? '#d97706' : '#dc2626';

  const rows = r.days
    .slice()
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .map(d => {
      const s = STATUS[d.status];
      return `<div class="day">
        <div class="day-info">
          <div class="day-date">${esc(fmtDate(d.date))}</div>
          ${d.disciplineName ? `<div class="day-disc">${esc(d.disciplineName)}</div>` : ''}
        </div>
        <span class="badge" style="color:${s.color};background:${s.bg}">${s.icon} ${s.label}</span>
      </div>`;
    })
    .join('');

  const card = (label: string, value: string | number, color: string) =>
    `<div class="stat"><div class="stat-val" style="color:${color}">${value}</div><div class="stat-lbl">${label}</div></div>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<title>Presença — ${esc(r.studentName)}</title>
<style>
  * { box-sizing: border-box; -webkit-text-size-adjust: 100%; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9; color: #0f172a; }
  .wrap { max-width: 560px; margin: 0 auto; padding: 16px; }
  .header { background: linear-gradient(135deg, #1e293b, #0f172a); color: #fff; border-radius: 18px; padding: 22px; }
  .header h1 { margin: 0; font-size: 22px; font-weight: 800; }
  .header .sub { margin-top: 4px; font-size: 14px; opacity: .8; }
  .freq { margin-top: 16px; display: flex; align-items: baseline; gap: 8px; }
  .freq .big { font-size: 40px; font-weight: 900; line-height: 1; }
  .freq .cap { font-size: 12px; opacity: .8; text-transform: uppercase; letter-spacing: .05em; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 14px 0; }
  .stat { background: #fff; border-radius: 14px; padding: 12px 6px; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,.05); }
  .stat-val { font-size: 22px; font-weight: 800; }
  .stat-lbl { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: .04em; margin-top: 2px; }
  .section-title { font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: .05em; margin: 18px 4px 10px; }
  .day { background: #fff; border-radius: 14px; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; box-shadow: 0 1px 2px rgba(0,0,0,.05); }
  .day-date { font-weight: 600; font-size: 15px; text-transform: capitalize; }
  .day-disc { font-size: 12px; color: #64748b; margin-top: 2px; }
  .badge { font-size: 13px; font-weight: 700; padding: 6px 12px; border-radius: 999px; white-space: nowrap; }
  .actions { position: sticky; bottom: 0; padding: 14px 0; background: linear-gradient(transparent, #f1f5f9 30%); }
  .btn { display: block; width: 100%; text-align: center; padding: 15px; border: none; border-radius: 14px; background: #2563eb; color: #fff; font-size: 16px; font-weight: 700; cursor: pointer; }
  .foot { text-align: center; font-size: 11px; color: #94a3b8; margin: 16px 0 8px; }
  @media print {
    body { background: #fff; }
    .actions { display: none; }
    .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .day, .stat { box-shadow: none; border: 1px solid #e2e8f0; }
  }
</style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>${esc(r.studentName)}</h1>
      <div class="sub">${esc(r.className)}${r.periodLabel ? ' · ' + esc(r.periodLabel) : ''}</div>
      <div class="freq">
        <span class="big" style="color:${freqColor === '#dc2626' ? '#fca5a5' : freqColor === '#d97706' ? '#fcd34d' : '#6ee7b7'}">${r.percentage}%</span>
        <span class="cap">Frequência</span>
      </div>
    </div>

    <div class="stats">
      ${card('Aulas', r.total, '#0f172a')}
      ${card('Presenças', r.present, '#059669')}
      ${card('Faltas', r.absent, '#dc2626')}
      ${card('Justif.', r.excused, '#d97706')}
    </div>

    <div class="section-title">Histórico de presença</div>
    ${rows || '<div class="day"><span class="day-date">Nenhuma aula registrada</span></div>'}

    <div class="foot">Gerado em ${esc(new Date().toLocaleDateString('pt-BR'))} · HUIOS</div>
  </div>

  <div class="actions">
    <button class="btn" onclick="window.print()">📄 Salvar como PDF / Imprimir</button>
  </div>
</body>
</html>`;
}

export function exportAttendanceHTML(report: StudentAttendanceReport) {
  const html = buildAttendanceHTML(report);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = report.studentName.normalize('NFD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase();
  a.href = url;
  a.download = `presenca-${safeName || 'aluno'}-${new Date().toISOString().slice(0, 10)}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
