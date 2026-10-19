'use client';

import { useState } from 'react';
import { confirmRegistration, cancelRegistration } from '../../actions';
import { exportCSV } from '@/lib/exportCSV';
import { exportEventRegistrationsReportPDF } from '@/lib/exportEventRegistrationsReportPDF';
import { maskCpf } from '@/lib/masks';

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface CustomField { id: string; label: string }
interface Registration {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  cpf: string;
  birthDate: string | null;
  isStudent: boolean;
  ticketName: string;
  amount: number;
  status: string;
  answers: Record<string, any>;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; badge: string }> = {
  PENDENTE: {
    label: 'Pendente',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40',
  },
  CONFIRMADA: {
    label: 'Confirmada',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40',
  },
  CANCELADA: {
    label: 'Cancelada',
    badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/40',
  },
  EXPIRADA: {
    label: 'Expirada',
    badge: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  },
};

const statusLabel: Record<string, string> = {
  PENDENTE: 'Pendente', CONFIRMADA: 'Confirmada', CANCELADA: 'Cancelada', EXPIRADA: 'Expirada',
};

function formatBirthDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  } catch {
    return '—';
  }
}

export default function InscritosClient({ eventTitle, customFields, registrations }: {
  eventTitle: string; customFields: CustomField[]; registrations: Registration[];
}) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [rows, setRows] = useState(registrations);

  const handleConfirm = async (id: string) => {
    if (!confirm('Confirmar o pagamento em dinheiro desta inscrição?')) return;
    setProcessingId(id);
    try {
      await confirmRegistration(id);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'CONFIRMADA' } : r)));
    } catch (err: any) {
      alert(err?.message || 'Erro ao confirmar inscrição.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancelar esta inscrição?')) return;
    setProcessingId(id);
    try {
      await cancelRegistration(id);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'CANCELADA' } : r)));
    } catch (err: any) {
      alert(err?.message || 'Erro ao cancelar inscrição.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      await exportEventRegistrationsReportPDF({
        generatedAt: new Date(),
        filters: {
          eventTitle,
          status: 'Todas',
          search: 'Não informada',
        },
        stats: {
          total: rows.length,
          confirmed: rows.filter((r) => (r.status || '').toUpperCase() === 'CONFIRMADA').length,
          pending: rows.filter((r) => (r.status || '').toUpperCase() === 'PENDENTE').length,
          canceled: rows.filter((r) => {
            const s = (r.status || '').toUpperCase();
            return s === 'CANCELADA' || s === 'EXPIRADA';
          }).length,
        },
        rows: rows.map((r) => {
          const sUpper = (r.status || '').trim().toUpperCase();
          return {
            name: r.name,
            cpf: r.cpf ? maskCpf(r.cpf) : '—',
            birthDate: formatBirthDate(r.birthDate),
            eventTitle,
            ticketName: r.ticketName,
            status: statusConfig[sUpper]?.label || statusLabel[r.status] || r.status,
          };
        }),
      });
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExport = () => {
    const headers = ['Nome', 'CPF', 'Data de Nascimento', 'E-mail', 'Telefone', 'Tipo', 'Lote', 'Valor', 'Situação', ...customFields.map((f) => f.label)];
    const dataRows = rows.map((r) => {
      const sUpper = (r.status || '').trim().toUpperCase();
      return [
        r.name,
        r.cpf ? maskCpf(r.cpf) : '',
        formatBirthDate(r.birthDate),
        r.email,
        r.phone || '',
        r.isStudent ? 'Aluno' : 'Não-aluno',
        r.ticketName,
        r.amount,
        statusConfig[sUpper]?.label || statusLabel[r.status] || r.status,
        ...customFields.map((f) => {
          const v = r.answers[f.id];
          return typeof v === 'boolean' ? (v ? 'Sim' : 'Não') : (v ?? '');
        }),
      ];
    });
    exportCSV(`inscritos-${eventTitle}.csv`, headers, dataRows);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-[16px]">file_download</span>
          Exportar CSV
        </button>

        <button
          onClick={handleExportPDF}
          disabled={exportingPDF || rows.length === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-primary/20"
        >
          <span className="material-symbols-outlined text-[16px]">
            {exportingPDF ? 'sync' : 'picture_as_pdf'}
          </span>
          {exportingPDF ? 'Gerando PDF...' : 'Exportar PDF'}
        </button>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 text-left text-slate-500">
            <tr>
              <th className="p-4 font-semibold">Nome</th>
              <th className="p-4 font-semibold">CPF</th>
              <th className="p-4 font-semibold">Nascimento</th>
              <th className="p-4 font-semibold">Contato</th>
              <th className="p-4 font-semibold">Tipo</th>
              <th className="p-4 font-semibold">Lote</th>
              <th className="p-4 font-semibold">Valor</th>
              <th className="p-4 font-semibold">Situação</th>
              <th className="p-4 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const statusUpper = (r.status || '').trim().toUpperCase();
              const isPendingStatus = statusUpper === 'PENDENTE';
              const isConfirmedStatus = statusUpper === 'CONFIRMADA';
              const canCancel = isPendingStatus || isConfirmedStatus;
              const isRowProcessing = processingId === r.id;
              const hasActions = isPendingStatus || canCancel;
              const config = statusConfig[statusUpper] || {
                label: statusLabel[r.status] || r.status,
                badge: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
              };

              return (
                <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-4 font-bold text-slate-900 dark:text-white">{r.name}</td>
                  <td className="p-4 font-mono text-slate-600 dark:text-slate-300">{r.cpf ? maskCpf(r.cpf) : '—'}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{formatBirthDate(r.birthDate)}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{r.email}{r.phone ? ` · ${r.phone}` : ''}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{r.isStudent ? 'Aluno' : 'Não-aluno'}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{r.ticketName}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{fmtBRL(r.amount)}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${config.badge}`}>
                      {config.label}
                    </span>
                  </td>
                  <td className="p-4 text-right whitespace-nowrap">
                    {hasActions ? (
                      <div className="flex items-center justify-end gap-1.5">
                        {isPendingStatus && (
                          <div className="relative group inline-flex">
                            <button
                              type="button"
                              disabled={processingId !== null}
                              onClick={() => handleConfirm(r.id)}
                              title="Confirmar (pago em dinheiro)"
                              aria-label="Confirmar (pago em dinheiro)"
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60 transition-colors border border-emerald-200 dark:border-emerald-800/50 shadow-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                            >
                              <span className={`material-symbols-outlined text-[18px] ${isRowProcessing ? 'animate-spin' : ''}`}>
                                {isRowProcessing ? 'refresh' : 'payments'}
                              </span>
                            </button>
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-30">
                              <div className="whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg">
                                Confirmar (pago em dinheiro)
                              </div>
                              <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-1" />
                            </div>
                          </div>
                        )}

                        {canCancel && (
                          <div className="relative group inline-flex">
                            <button
                              type="button"
                              disabled={processingId !== null}
                              onClick={() => handleCancel(r.id)}
                              title="Cancelar inscrição"
                              aria-label="Cancelar inscrição"
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 transition-colors border border-rose-200 dark:border-rose-800/50 shadow-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                            >
                              <span className={`material-symbols-outlined text-[18px] ${isRowProcessing ? 'animate-spin' : ''}`}>
                                {isRowProcessing ? 'refresh' : 'cancel'}
                              </span>
                            </button>
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-30">
                              <div className="whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg">
                                Cancelar
                              </div>
                              <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-1" />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={9} className="p-8 text-center text-slate-400">Nenhuma inscrição ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
