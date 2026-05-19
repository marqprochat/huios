'use client';

import { useState, useEffect, useRef } from 'react';

interface AbsenceJustification {
  id: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  fileName: string;
  createdAt: string;
  reviewNotes: string | null;
  reviewedAt: string | null;
}

interface AbsenceRecord {
  id: string;
  lessonDate: string;
  status: string;
  justification: AbsenceJustification | null;
}

interface DisciplineAbsences {
  disciplineId: string;
  disciplineName: string;
  totalLessons: number;
  absentCount: number;
  absenceRate: number;
  ruleStatus: 'OK' | 'NEEDS_JUSTIFICATION' | 'AUTO_FAILED';
  absences: AbsenceRecord[];
}

export default function PresencaPortalPage() {
  const [disciplines, setDisciplines] = useState<DisciplineAbsences[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [selectedAbsence, setSelectedAbsence] = useState<AbsenceRecord | null>(null);
  const [selectedDiscipline, setSelectedDiscipline] = useState<DisciplineAbsences | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPendencias();
  }, []);

  const fetchPendencias = async () => {
    try {
      const res = await fetch('/api/portal/presenca/pendencias');
      if (res.ok) {
        const data = await res.json();
        setDisciplines(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openUploadModal = (absence: AbsenceRecord, discipline: DisciplineAbsences) => {
    setSelectedAbsence(absence);
    setSelectedDiscipline(discipline);
  };

  const closeModal = () => {
    setSelectedAbsence(null);
    setSelectedDiscipline(null);
    setDragOver(false);
  };

  const handleFileUpload = async (file: File) => {
    if (!selectedAbsence) return;

    const allowed = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg', 'image/png', 'text/plain'];
    if (!allowed.includes(file.type)) {
      setMessage({ type: 'error', text: 'Formato inválido. Envie PDF, Word, imagem ou TXT.' });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Arquivo muito grande. Máximo 20MB.' });
      return;
    }

    setUploading(selectedAbsence.id);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('attendanceId', selectedAbsence.id);

      const res = await fetch('/api/portal/presenca/justificativa', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Resumo enviado com sucesso! Aguarde a aprovação da diretoria.' });
        closeModal();
        fetchPendencias();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Erro ao enviar arquivo.' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Erro de conexão. Tente novamente.' });
    } finally {
      setUploading(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      weekday: 'short', day: '2-digit', month: 'long', year: 'numeric'
    });
  };

  const ruleStatusConfig = {
    OK: { label: 'Regular', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: 'check_circle', iconColor: 'text-emerald-500' },
    NEEDS_JUSTIFICATION: { label: 'Justificativa necessária', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'warning', iconColor: 'text-amber-500' },
    AUTO_FAILED: { label: 'Reprovado por faltas', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: 'cancel', iconColor: 'text-red-500' }
  };

  const justificationStatusConfig = {
    PENDING_REVIEW: { label: 'Aguardando análise', bg: 'bg-amber-50', text: 'text-amber-700', icon: 'hourglass_empty' },
    APPROVED: { label: 'Aprovado', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'check_circle' },
    REJECTED: { label: 'Rejeitado', bg: 'bg-red-50', text: 'text-red-700', icon: 'cancel' }
  };

  const hasAnyAbsence = disciplines.some(d => d.absentCount > 0);

  return (
    <div className="max-w-3xl mx-auto p-4 lg:p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Frequência e Presenças</h2>
        <p className="text-slate-500 text-sm mt-1">
          Acompanhe suas faltas por disciplina e envie justificativas quando necessário.
        </p>
      </div>

      {/* Mensagem global */}
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

      {/* Regra de frequência */}
      <div className="bg-[#135bec]/5 border border-[#135bec]/20 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-[#135bec]">info</span>
          <div>
            <p className="font-semibold text-[#135bec] text-sm">Regra de Frequência por Disciplina</p>
            <ul className="text-xs text-slate-600 mt-2 space-y-1">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0"></span>
                <span><strong>1 falta (33,33%):</strong> Você deve enviar um resumo da aula para análise da diretoria.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0"></span>
                <span><strong>2 faltas (66,67%):</strong> Reprovação automática na disciplina.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="material-symbols-outlined animate-spin text-[#135bec] text-4xl">refresh</span>
        </div>
      ) : !hasAnyAbsence ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-emerald-400">how_to_reg</span>
          <p className="font-semibold text-slate-700 mt-3">Frequência em dia!</p>
          <p className="text-slate-400 text-sm mt-1">Você não tem nenhuma falta registrada.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {disciplines.filter(d => d.absentCount > 0).map(discipline => {
            const cfg = ruleStatusConfig[discipline.ruleStatus];

            return (
              <div key={discipline.disciplineId} className={`rounded-2xl border ${cfg.border} overflow-hidden`}>
                {/* Header da disciplina */}
                <div className={`${cfg.bg} p-5`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className={`material-symbols-outlined text-2xl ${cfg.iconColor}`}>{cfg.icon}</span>
                      <div>
                        <p className="font-bold text-slate-800">{discipline.disciplineName}</p>
                        <p className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-2xl font-black ${cfg.text}`}>{discipline.absentCount}/{discipline.totalLessons}</p>
                      <p className="text-xs text-slate-500">faltas ({discipline.absenceRate}%)</p>
                    </div>
                  </div>

                  {/* Barra de faltas */}
                  <div className="mt-3 h-2 bg-white/60 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        discipline.ruleStatus === 'AUTO_FAILED' ? 'bg-red-500' :
                        discipline.ruleStatus === 'NEEDS_JUSTIFICATION' ? 'bg-amber-500' :
                        'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(discipline.absenceRate, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Lista de faltas */}
                <div className="bg-white divide-y divide-slate-100">
                  {discipline.absences.map(absence => {
                    const justCfg = absence.justification
                      ? justificationStatusConfig[absence.justification.status]
                      : null;
                    const canUpload = discipline.ruleStatus === 'NEEDS_JUSTIFICATION' &&
                      (!absence.justification || absence.justification.status === 'REJECTED');

                    return (
                      <div key={absence.id} className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-red-500 text-lg">event_busy</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 text-sm">
                            {formatDate(absence.lessonDate)}
                          </p>
                          {absence.justification ? (
                            <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${justCfg?.bg} ${justCfg?.text}`}>
                              <span className="material-symbols-outlined text-xs">{justCfg?.icon}</span>
                              {justCfg?.label}
                              {absence.justification.fileName && (
                                <span className="opacity-70 ml-1">• {absence.justification.fileName}</span>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 mt-0.5">Sem justificativa</p>
                          )}
                          {absence.justification?.reviewNotes && (
                            <p className="text-xs text-red-600 mt-1 italic">
                              Obs: {absence.justification.reviewNotes}
                            </p>
                          )}
                        </div>
                        {canUpload && (
                          <button
                            onClick={() => openUploadModal(absence, discipline)}
                            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-200"
                          >
                            <span className="material-symbols-outlined text-sm">upload_file</span>
                            Enviar Resumo
                          </button>
                        )}
                        {discipline.ruleStatus === 'AUTO_FAILED' && (
                          <span className="flex-shrink-0 text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-xl border border-red-100">
                            Reprovado
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de upload */}
      {selectedAbsence && selectedDiscipline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-amber-500 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-xs font-semibold uppercase tracking-wide">Enviar Justificativa</p>
                  <h3 className="text-xl font-bold mt-1">{selectedDiscipline.disciplineName}</h3>
                  <p className="text-white/80 text-sm mt-0.5">
                    Falta em {formatDate(selectedAbsence.lessonDate)}
                  </p>
                </div>
                <button onClick={closeModal} className="p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-800 mb-1">O que enviar?</p>
                <p>Envie um <strong>resumo da aula</strong> que você perdeu. O documento será analisado pela diretoria para aprovação da justificativa.</p>
              </div>

              {/* Área de upload */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-amber-400 bg-amber-50'
                    : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50/50'
                }`}
              >
                {uploading === selectedAbsence.id ? (
                  <div className="space-y-2">
                    <span className="material-symbols-outlined text-4xl text-amber-500 animate-spin">refresh</span>
                    <p className="text-sm font-medium text-slate-600">Enviando arquivo...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <span className="material-symbols-outlined text-4xl text-slate-300">upload_file</span>
                    <p className="font-semibold text-slate-600 text-sm">
                      Arraste e solte o arquivo aqui
                    </p>
                    <p className="text-xs text-slate-400">ou clique para selecionar</p>
                    <p className="text-xs text-slate-400 mt-2">PDF, Word, imagem ou TXT • Máximo 20MB</p>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                onChange={handleFileSelect}
              />

              {selectedAbsence.justification?.status === 'REJECTED' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                  <p className="font-semibold">Justificativa anterior rejeitada</p>
                  {selectedAbsence.justification.reviewNotes && (
                    <p className="text-xs mt-1">Motivo: {selectedAbsence.justification.reviewNotes}</p>
                  )}
                  <p className="text-xs mt-1 opacity-70">Você pode enviar um novo arquivo.</p>
                </div>
              )}

              <button
                onClick={closeModal}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
