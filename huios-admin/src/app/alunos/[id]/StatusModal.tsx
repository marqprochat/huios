"use client";

import { useState } from "react";
import { updateEnrollmentStatus } from "../enrollment-actions";
import { useToast } from "@/app/components/Toast/useToast";

interface StatusModalProps {
  studentId: string;
  enrollmentId: string;
  currentStatus: string;
  currentDate?: Date | null;
  currentReason?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function StatusModal({
  studentId,
  enrollmentId,
  currentStatus,
  currentDate,
  currentReason,
  onClose,
  onSuccess,
}: StatusModalProps) {
  const [status, setStatus] = useState(currentStatus);
  const [date, setDate] = useState(
    currentDate ? new Date(currentDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]
  );
  const [reason, setReason] = useState(currentReason || "");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await updateEnrollmentStatus(enrollmentId, status, date, reason, studentId);

    if (result.success) {
      toast("success", result.message);
      onSuccess();
      onClose();
    } else {
      toast("error", result.message);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-900 dark:text-white">
            Alterar Status da Matrícula
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Novo Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              required
            >
              <option value="CURSANDO">Cursando</option>
              <option value="TRANCADO">Trancado</option>
              <option value="APROVADO">Aprovado</option>
              <option value="REPROVADO">Reprovado</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Data da Alteração
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Motivo / Observações
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Motivos pessoais, Mudança de cidade, etc."
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none min-h-[100px] resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-3 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary text-white px-5 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {loading ? "Salvando..." : "Salvar Alteração"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
