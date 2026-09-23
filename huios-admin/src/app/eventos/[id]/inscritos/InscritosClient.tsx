'use client';

import { useState, useTransition } from 'react';
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
  const [isPending, startTransition] = useTransition();
  const [exportingPDF, setExportingPDF] = useState(false);
  const [rows, setRows] = useState(registrations);

  const handleConfirm = (id: string) => startTransition(async () => {
    await confirmRegistration(id);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'CONFIRMADA' } : r)));
  });

  const handleCancel = (id: string) => startTransition(async () => {
    if (!confirm('Cancelar esta inscrição?')) return;
    await cancelRegistration(id);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'CANCELADA' } : r)));
  });

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
          confirmed: rows.filter((r) => r.status === 'CONFIRMADA').length,
          pending: rows.filter((r) => r.status === 'PENDENTE').length,
          canceled: rows.filter((r) => r.status === 'CANCELADA' || r.status === 'EXPIRADA').length,
        },
        rows: rows.map((r) => ({
          name: r.name,
          cpf: r.cpf ? maskCpf(r.cpf) : '—',
          birthDate: formatBirthDate(r.birthDate),
          eventTitle,
          ticketName: r.ticketName,
          status: statusLabel[r.status] || r.status,
        })),
      });
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExport = () => {
    const headers = ['Nome', 'CPF', 'Data de Nascimento', 'E-mail', 'Telefone', 'Tipo', 'Lote', 'Valor', 'Situação', ...customFields.map((f) => f.label)];
    const dataRows = rows.map((r) => [
      r.name,
      r.cpf ? maskCpf(r.cpf) : '',
      formatBirthDate(r.birthDate),
      r.email,
      r.phone || '',
      r.isStudent ? 'Aluno' : 'Não-aluno',
      r.ticketName,
      r.amount,
      statusLabel[r.status] || r.status,
      ...customFields.map((f) => {
        const v = r.answers[f.id];
        return typeof v === 'boolean' ? (v ? 'Sim' : 'Não') : (v ?? '');
      }),
    ]);
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
              <th className="p-4 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="p-4 font-bold text-slate-900 dark:text-white">{r.name}</td>
                <td className="p-4 font-mono text-slate-600 dark:text-slate-300">{r.cpf ? maskCpf(r.cpf) : '—'}</td>
                <td className="p-4 text-slate-600 dark:text-slate-300">{formatBirthDate(r.birthDate)}</td>
                <td className="p-4 text-slate-600 dark:text-slate-300">{r.email}{r.phone ? ` · ${r.phone}` : ''}</td>
                <td className="p-4 text-slate-600 dark:text-slate-300">{r.isStudent ? 'Aluno' : 'Não-aluno'}</td>
                <td className="p-4 text-slate-600 dark:text-slate-300">{r.ticketName}</td>
                <td className="p-4 text-slate-600 dark:text-slate-300">{fmtBRL(r.amount)}</td>
                <td className="p-4">
                  <span className="text-xs font-bold uppercase">{statusLabel[r.status] || r.status}</span>
                </td>
                <td className="p-4 text-right space-x-3 whitespace-nowrap">
                  {r.status === 'PENDENTE' && (
                    <button disabled={isPending} onClick={() => handleConfirm(r.id)} className="text-emerald-600 text-xs font-bold hover:underline disabled:opacity-50">
                      Confirmar (pago em dinheiro)
                    </button>
                  )}
                  {(r.status === 'PENDENTE' || r.status === 'CONFIRMADA') && (
                    <button disabled={isPending} onClick={() => handleCancel(r.id)} className="text-red-500 text-xs font-bold hover:underline disabled:opacity-50">
                      Cancelar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={9} className="p-8 text-center text-slate-400">Nenhuma inscrição ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
