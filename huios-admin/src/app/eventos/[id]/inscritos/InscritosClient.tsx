'use client';

import { useState, useTransition } from 'react';
import { confirmRegistration, cancelRegistration } from '../../actions';
import { exportCSV } from '@/lib/exportCSV';

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface CustomField { id: string; label: string }
interface Registration {
  id: string; name: string; email: string; phone: string | null; isStudent: boolean;
  ticketName: string; amount: number; status: string; answers: Record<string, any>; createdAt: string;
}

const statusLabel: Record<string, string> = {
  PENDENTE: 'Pendente', CONFIRMADA: 'Confirmada', CANCELADA: 'Cancelada', EXPIRADA: 'Expirada',
};

export default function InscritosClient({ eventTitle, customFields, registrations }: {
  eventTitle: string; customFields: CustomField[]; registrations: Registration[];
}) {
  const [isPending, startTransition] = useTransition();
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

  const handleExport = () => {
    const headers = ['Nome', 'E-mail', 'Telefone', 'Tipo', 'Lote', 'Valor', 'Situação', ...customFields.map((f) => f.label)];
    const dataRows = rows.map((r) => [
      r.name, r.email, r.phone || '', r.isStudent ? 'Aluno' : 'Não-aluno', r.ticketName,
      r.amount, statusLabel[r.status] || r.status,
      ...customFields.map((f) => {
        const v = r.answers[f.id];
        return typeof v === 'boolean' ? (v ? 'Sim' : 'Não') : (v ?? '');
      }),
    ]);
    exportCSV(`inscritos-${eventTitle}.csv`, headers, dataRows);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={handleExport} className="text-primary text-sm font-bold hover:underline">Exportar CSV</button>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 text-left text-slate-500">
            <tr>
              <th className="p-4 font-semibold">Nome</th>
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
              <tr><td colSpan={7} className="p-8 text-center text-slate-400">Nenhuma inscrição ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
