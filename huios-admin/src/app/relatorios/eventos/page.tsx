'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { exportEventRegistrationsReportPDF } from '@/lib/exportEventRegistrationsReportPDF';
import { exportCSV } from '@/lib/exportCSV';

interface EventOption {
  id: string;
  title: string;
  date: string;
}

interface RegistrationRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  birthDate: string;
  eventId: string;
  eventTitle: string;
  ticketName: string;
  status: string;
  amount: number;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  CONFIRMADA: { label: 'Confirmada', color: 'text-emerald-700', bg: 'bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400' },
  PENDENTE:   { label: 'Pendente',   color: 'text-amber-700',   bg: 'bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400' },
  CANCELADA:  { label: 'Cancelada',  color: 'text-red-700',     bg: 'bg-red-100 dark:bg-red-900/30 dark:text-red-400' },
  EXPIRADA:   { label: 'Expirada',   color: 'text-slate-700',   bg: 'bg-slate-100 dark:bg-slate-800 dark:text-slate-400' },
};

export default function RelatorioInscritosEventosPage() {
  const [rows, setRows] = useState<RegistrationRow[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingPDF, setExportingPDF] = useState(false);

  const [eventId, setEventId] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const loadData = (p: URLSearchParams) => {
    setLoading(true);
    fetch(`/api/relatorios/eventos?${p.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setRows(data.rows ?? []);
        setEvents(data.events ?? []);
      })
      .catch((err) => {
        console.error('Erro ao carregar dados:', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData(new URLSearchParams());
  }, []);

  useEffect(() => {
    const p = new URLSearchParams();
    if (eventId) p.set('eventId', eventId);
    if (status) p.set('status', status);
    loadData(p);
  }, [eventId, status]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      r.cpf.toLowerCase().includes(q) ||
      r.eventTitle.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const stats = useMemo(() => ({
    total: filtered.length,
    confirmed: filtered.filter((r) => r.status === 'CONFIRMADA').length,
    pending: filtered.filter((r) => r.status === 'PENDENTE').length,
    canceled: filtered.filter((r) => r.status === 'CANCELADA' || r.status === 'EXPIRADA').length,
  }), [filtered]);

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const selectedEvent = events.find((e) => e.id === eventId);
      await exportEventRegistrationsReportPDF({
        generatedAt: new Date(),
        filters: {
          eventTitle: selectedEvent ? selectedEvent.title : 'Todos os eventos',
          status: status ? (STATUS_CONFIG[status]?.label ?? status) : 'Todas as situações',
          search: search.trim() || 'Não informada',
        },
        stats,
        rows: filtered.map((r) => ({
          name: r.name,
          cpf: r.cpf,
          birthDate: r.birthDate,
          eventTitle: r.eventTitle,
          ticketName: r.ticketName,
          status: STATUS_CONFIG[r.status]?.label ?? r.status,
        })),
      });
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Nome Completo', 'CPF', 'Data de Nascimento', 'Evento', 'Lote', 'Situação', 'Telefone', 'E-mail'];
    const dataRows = filtered.map((r) => [
      r.name,
      r.cpf,
      r.birthDate,
      r.eventTitle,
      r.ticketName,
      STATUS_CONFIG[r.status]?.label ?? r.status,
      r.phone,
      r.email,
    ]);
    exportCSV('relatorio-inscritos-eventos.csv', headers, dataRows);
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 lg:p-8 space-y-6">
      {/* Topo com Título e Ações */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/relatorios"
            className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Inscritos em Eventos
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              Relatório de participantes por evento com nome, CPF e data de nascimento.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">file_download</span>
            Exportar CSV
          </button>

          <button
            onClick={handleExportPDF}
            disabled={exportingPDF || filtered.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-[18px]">
              {exportingPDF ? 'sync' : 'picture_as_pdf'}
            </span>
            {exportingPDF ? 'Gerando PDF...' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total de Inscritos</p>
          <p className="text-3xl font-black text-slate-800 dark:text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Confirmadas</p>
          <p className="text-3xl font-black text-emerald-600 mt-1">{stats.confirmed}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pendentes</p>
          <p className="text-3xl font-black text-amber-600 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Canceladas / Exp.</p>
          <p className="text-3xl font-black text-rose-600 mt-1">{stats.canceled}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[240px]">
          <label className="block text-xs font-bold text-slate-500 mb-1">Evento</label>
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Todos os eventos</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title} ({new Date(ev.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })})
              </option>
            ))}
          </select>
        </div>

        <div className="w-48">
          <label className="block text-xs font-bold text-slate-500 mb-1">Situação</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Todas as situações</option>
            <option value="CONFIRMADA">Confirmada</option>
            <option value="PENDENTE">Pendente</option>
            <option value="CANCELADA">Cancelada</option>
            <option value="EXPIRADA">Expirada</option>
          </select>
        </div>

        <div className="flex-1 min-w-[240px]">
          <label className="block text-xs font-bold text-slate-500 mb-1">Buscar por Nome, CPF ou Evento</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">
              search
            </span>
            <input
              type="text"
              placeholder="Digite para filtrar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </div>

      {/* Tabela de Inscritos */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="p-4">Nome Completo</th>
                <th className="p-4 text-center">CPF</th>
                <th className="p-4 text-center">Data de Nascimento</th>
                <th className="p-4">Evento</th>
                <th className="p-4">Lote</th>
                <th className="p-4 text-center">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined animate-spin text-2xl text-primary">sync</span>
                      <p>Carregando inscritos...</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    Nenhum inscrito encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const statusInfo = STATUS_CONFIG[r.status] || {
                    label: r.status,
                    color: 'text-slate-700',
                    bg: 'bg-slate-100',
                  };
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-4 font-bold text-slate-900 dark:text-white">
                        {r.name}
                        {r.email && (
                          <div className="text-xs font-normal text-slate-400">{r.email}</div>
                        )}
                      </td>
                      <td className="p-4 text-center font-mono text-slate-600 dark:text-slate-300">
                        {r.cpf}
                      </td>
                      <td className="p-4 text-center font-medium text-slate-700 dark:text-slate-300">
                        {r.birthDate}
                      </td>
                      <td className="p-4 text-slate-700 dark:text-slate-300 font-semibold">
                        {r.eventTitle}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">
                        {r.ticketName}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase ${statusInfo.bg} ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
