'use client';

import { useState, useEffect } from 'react';

interface Justification {
  id: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  reviewNotes: string | null;
  reviewedAt: string | null;
  student: { id: string; name: string; email: string };
  discipline: { id: string; name: string };
  attendance: {
    id: string;
    lesson: { id: string; date: string; locationName: string | null }
  };
}

type FilterStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'ALL';

export default function PendenciasPage() {
  const [justifications, setJustifications] = useState<Justification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('PENDING_REVIEW');
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Justification | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchJustifications();
  }, [filter]);

  const fetchJustifications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/pendencias?status=${filter}`);
      if (res.ok) {
        setJustifications(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openReview = (item: Justification) => {
    setSelectedItem(item);
    setReviewNotes('');
    setReviewing(null);
  };

  const handleReview = async (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedItem) return;

    if (status === 'REJECTED' && !reviewNotes.trim()) {
      setMessage({ type: 'error', text: 'Informe o motivo da rejeição.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/pendencias/${selectedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reviewNotes: reviewNotes.trim() || null })
      });

      if (res.ok) {
        const action = status === 'APPROVED' ? 'aprovada' : 'rejeitada';
        setMessage({ type: 'success', text: `Justificativa ${action} com sucesso!` });
        setSelectedItem(null);
        fetchJustifications();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Erro ao revisar justificativa.' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Erro de conexão. Tente novamente.' });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const statusConfig = {
    PENDING_REVIEW: { label: 'Aguardando análise', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
    APPROVED: { label: 'Aprovada', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    REJECTED: { label: 'Rejeitada', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' }
  };

  const filters: { key: FilterStatus; label: string; icon: string }[] = [
    { key: 'PENDING_REVIEW', label: 'Aguardando', icon: 'hourglass_empty' },
    { key: 'APPROVED', label: 'Aprovadas', icon: 'check_circle' },
    { key: 'REJECTED', label: 'Rejeitadas', icon: 'cancel' },
    { key: 'ALL', label: 'Todas', icon: 'list' }
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Pendências de Presença
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Gerencie as justificativas de falta enviadas pelos alunos.
          </p>
        </div>
      </div>

      {message && (
        <div className={`rounded-2xl p-4 flex items-start gap-3 border ${
          message.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <span className="material-symbols-outlined text-xl flex-shrink-0">
            {message.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <p className="text-sm font-medium">{message.text}</p>
          <button onClick={() => setMessage(null)} className="ml-auto">
            <span className="material-symbols-outlined text-sm opacity-60">close</span>
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
              filter === f.key
                ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-primary/40'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{f.icon}</span>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span>
        </div>
      ) : justifications.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">task_alt</span>
          <p className="font-semibold text-slate-600 dark:text-slate-400 mt-3">Nenhuma pendência encontrada</p>
          <p className="text-slate-400 text-sm mt-1">
            {filter === 'PENDING_REVIEW' ? 'Não há justificativas aguardando análise.' : 'Nenhum registro nesta categoria.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {justifications.map(item => {
            const cfg = statusConfig[item.status];
            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-5 hover:border-primary/30 transition-all"
              >
                {/* Ícone do arquivo */}
                <div className="w-12 h-12 rounded-xl bg-[#135bec]/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[#135bec]">
                    {item.mimeType.includes('pdf') ? 'picture_as_pdf' :
                     item.mimeType.includes('image') ? 'image' : 'description'}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-slate-800 dark:text-slate-200">{item.student.name}</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    <span className="font-medium">{item.discipline.name}</span>
                    {' • '}
                    Falta em {formatDate(item.attendance.lesson.date)}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">attach_file</span>
                      {item.fileName} ({formatFileSize(item.fileSize)})
                    </span>
                    <span className="text-xs text-slate-400">
                      Enviado em {formatDate(item.createdAt)}
                    </span>
                  </div>
                  {item.reviewNotes && (
                    <p className="text-xs text-slate-500 mt-1 italic">Obs: {item.reviewNotes}</p>
                  )}
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a
                    href={`/uploads/${item.filePath}`}
                    target="_blank"
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-[#135bec] hover:border-[#135bec]/40 transition-all"
                    title="Visualizar arquivo"
                  >
                    <span className="material-symbols-outlined text-lg">open_in_new</span>
                  </a>
                  {item.status === 'PENDING_REVIEW' && (
                    <button
                      onClick={() => openReview(item)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-md shadow-primary/20"
                    >
                      <span className="material-symbols-outlined text-sm">rate_review</span>
                      Analisar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de análise */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">Analisar Justificativa</h3>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="material-symbols-outlined text-slate-400">close</span>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Info do aluno */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Aluno</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedItem.student.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Disciplina</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedItem.discipline.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Data da falta</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatDate(selectedItem.attendance.lesson.date)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Arquivo</span>
                  <a
                    href={`/uploads/${selectedItem.filePath}`}
                    target="_blank"
                    className="font-semibold text-[#135bec] hover:underline flex items-center gap-1"
                  >
                    {selectedItem.fileName}
                    <span className="material-symbols-outlined text-xs">open_in_new</span>
                  </a>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Observações <span className="text-slate-400 font-normal">(obrigatório ao rejeitar)</span>
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  placeholder="Ex: O resumo não atende aos requisitos mínimos exigidos..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                />
              </div>

              {message && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
                  {message.text}
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleReview('REJECTED')}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-red-300 text-red-600 font-bold text-sm hover:bg-red-50 transition-all disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">cancel</span>
                  Rejeitar
                </button>
                <button
                  onClick={() => handleReview('APPROVED')}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition-all shadow-md shadow-emerald-200 disabled:opacity-50"
                >
                  {saving
                    ? <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                    : <span className="material-symbols-outlined text-sm">check_circle</span>
                  }
                  Aprovar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
