'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Exam {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  duration: number | null;
  discipline: {
    name: string;
    courseClasses: { name: string }[];
  };
  questions: Array<any>;
  submissions: Array<{
    id: string;
    submittedAt: string | null;
    score: number | null;
    maxScore: number | null;
  }>;
}

export default function ProvasPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'done' | 'expired'>('all');

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const res = await fetch('/api/portal/provas');
      if (res.ok) {
        const data = await res.json();
        setExams(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();

  const getExamStatus = (exam: Exam) => {
    const hasSubmission = exam.submissions?.length > 0 && exam.submissions[0]?.submittedAt;
    const isOpen = new Date(exam.startDate) <= now && new Date(exam.endDate) >= now;
    const isExpired = new Date(exam.endDate) < now;
    const isUpcoming = new Date(exam.startDate) > now;

    if (hasSubmission) return 'done';
    if (isExpired) return 'expired';
    if (isOpen) return 'pending';
    if (isUpcoming) return 'upcoming';
    return 'unknown';
  };

  const filteredExams = exams.filter(e => {
    if (filter === 'all') return true;
    return getExamStatus(e) === filter;
  });

  const statusConfig: Record<string, { label: string; icon: string; color: string; bg: string }> = {
    pending: { label: 'Disponível', icon: 'edit_note', color: 'text-[#135bec]', bg: 'bg-[#135bec]/10' },
    done: { label: 'Concluída', icon: 'check_circle', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    expired: { label: 'Encerrada', icon: 'schedule', color: 'text-red-600', bg: 'bg-red-50' },
    upcoming: { label: 'Em Breve', icon: 'hourglass_top', color: 'text-amber-600', bg: 'bg-amber-50' },
    unknown: { label: 'Desconhecido', icon: 'help', color: 'text-slate-400', bg: 'bg-slate-50' },
  };

  const pendingCount = exams.filter(e => getExamStatus(e) === 'pending').length;
  const doneCount = exams.filter(e => getExamStatus(e) === 'done').length;

  return (
    <div className="max-w-[1400px] mx-auto p-4 lg:p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Provas</h2>
        <p className="text-slate-500 text-sm">Visualize e responda suas avaliações</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</p>
          <p className="text-2xl font-bold text-slate-700 mt-1">{exams.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pendentes</p>
          <p className={`text-2xl font-bold mt-1 ${pendingCount > 0 ? 'text-[#135bec]' : 'text-slate-300'}`}>{pendingCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Concluídas</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{doneCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Encerradas</p>
          <p className="text-2xl font-bold text-slate-300 mt-1">{exams.filter(e => getExamStatus(e) === 'expired').length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto">
        {(['all', 'pending', 'done', 'expired'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
              filter === f
                ? 'bg-[#135bec] text-white shadow-lg shadow-[#135bec]/25'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {{ all: 'Todas', pending: 'Pendentes', done: 'Concluídas', expired: 'Encerradas' }[f]}
          </button>
        ))}
      </div>

      {/* Exams List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="material-symbols-outlined animate-spin text-[#135bec] text-3xl">refresh</span>
        </div>
      ) : filteredExams.length > 0 ? (
        <div className="space-y-4">
          {filteredExams.map((exam) => {
            const status = getExamStatus(exam);
            const config = statusConfig[status];
            const submission = exam.submissions?.[0];
            const daysLeft = Math.ceil((new Date(exam.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            return (
              <div key={exam.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className={`w-12 h-12 ${config.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <span className={`material-symbols-outlined ${config.color}`}>{config.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-800 truncate">{exam.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{exam.discipline.name} • {exam.discipline.courseClasses.map(cc => cc.name).join(', ')}</p>

                      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">help</span>
                          {exam.questions.length} questões
                        </span>
                        {exam.duration && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">timer</span>
                            {exam.duration} min
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">event</span>
                          {new Date(exam.endDate).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.color}`}>
                      {config.label}
                    </span>

                    {status === 'pending' && (
                      <>
                        {daysLeft <= 3 && (
                          <span className="text-[10px] font-semibold text-red-500">
                            {daysLeft <= 0 ? 'Último dia!' : `${daysLeft} dia(s)`}
                          </span>
                        )}
                        <Link
                          href={`/portal/provas/${exam.id}`}
                          className="bg-[#135bec] text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#0d47a1] transition-all flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">edit_note</span>
                          Responder
                        </Link>
                      </>
                    )}

                    {status === 'done' && submission && (
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400">Nota</p>
                        <p className={`text-lg font-bold ${
                          submission.score !== null && submission.maxScore
                            ? ((submission.score / submission.maxScore) * 10 >= 7 ? 'text-emerald-600' : 'text-amber-600')
                            : 'text-slate-400'
                        }`}>
                          {submission.score !== null && submission.maxScore
                            ? ((submission.score / submission.maxScore) * 10).toFixed(1)
                            : '—'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-300 mb-3">quiz</span>
          <p className="text-slate-500">Nenhuma prova encontrada</p>
        </div>
      )}
    </div>
  );
}
