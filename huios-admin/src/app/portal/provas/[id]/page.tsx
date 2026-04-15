'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/app/components/Toast/useToast';

interface Alternative {
  id: string;
  letter: string;
  text: string;
}

interface Question {
  id: string;
  statement: string;
  type: string;
  order: number;
  weight: number;
  alternatives: Alternative[];
}

interface Exam {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  duration: number | null;
  discipline: { name: string; courseClasses: { name: string }[] };
  questions: Question[];
  submissions: Array<{ submittedAt: string | null; score: number | null; maxScore: number | null }>;
}

export default function ResponderProvaPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;
  const { toast } = useToast();

  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; maxScore: number; gradeScore: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetchExam();
  }, [examId]);

  const fetchExam = async () => {
    try {
      const res = await fetch('/api/portal/provas');
      if (res.ok) {
        const exams = await res.json();
        const found = exams.find((e: Exam) => e.id === examId);
        if (found) {
          setExam(found);
          if (found.duration) {
            setTimeLeft(found.duration * 60);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || result) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, result]);

  const handleSubmit = useCallback(async () => {
    if (submitting || result) return;
    setSubmitting(true);

    try {
      const answersArray = Object.entries(answers).map(([questionId, alternativeId]) => ({
        questionId,
        alternativeId,
      }));

      const res = await fetch(`/api/portal/provas/${examId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answersArray }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult(data);
      } else {
        toast('error', 'Erro ao submeter prova', data.error || 'Tente novamente mais tarde.');
      }
    } catch (e) {
      console.error(e);
      toast('error', 'Erro de conexão', 'Não foi possível submeter a prova. Verifique sua internet.');
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  }, [answers, examId, submitting, result]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <span className="material-symbols-outlined animate-spin text-[#135bec] text-3xl">refresh</span>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="max-w-lg mx-auto p-8 text-center">
        <span className="material-symbols-outlined text-4xl text-slate-300 mb-3">error</span>
        <p className="text-slate-500">Prova não encontrada</p>
      </div>
    );
  }

  const isAlreadySubmitted = exam.submissions?.length > 0 && exam.submissions[0]?.submittedAt;

  if (isAlreadySubmitted && !result) {
    const sub = exam.submissions[0];
    return (
      <div className="max-w-lg mx-auto p-4 lg:p-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <span className="material-symbols-outlined text-5xl text-emerald-500 mb-4">check_circle</span>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Prova já realizada</h2>
          <p className="text-slate-500 text-sm mb-4">{exam.title}</p>
          {sub.score !== null && sub.maxScore && (
            <div className="bg-slate-50 rounded-xl p-6 inline-block">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Nota</p>
              <p className={`text-4xl font-bold ${
                (sub.score / sub.maxScore) * 10 >= 7 ? 'text-emerald-600' : 'text-amber-600'
              }`}>
                {((sub.score / sub.maxScore) * 10).toFixed(1)}
              </p>
            </div>
          )}
          <div className="mt-6">
            <button onClick={() => router.push('/portal/provas')} className="bg-[#135bec] text-white px-6 py-2.5 rounded-xl text-sm font-semibold">
              Voltar às Provas
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="max-w-lg mx-auto p-4 lg:p-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
            result.gradeScore >= 7 ? 'bg-emerald-50' : 'bg-amber-50'
          }`}>
            <span className={`material-symbols-outlined text-4xl ${
              result.gradeScore >= 7 ? 'text-emerald-500' : 'text-amber-500'
            }`}>
              {result.gradeScore >= 7 ? 'emoji_events' : 'trending_up'}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            {result.gradeScore >= 7 ? 'Parabéns!' : 'Prova Concluída'}
          </h2>
          <p className="text-slate-500 text-sm mb-6">{exam.title}</p>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Nota</p>
              <p className={`text-2xl font-bold ${result.gradeScore >= 7 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {result.gradeScore.toFixed(1)}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Acertos</p>
              <p className="text-2xl font-bold text-[#135bec]">{result.score}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total</p>
              <p className="text-2xl font-bold text-slate-400">{result.maxScore}</p>
            </div>
          </div>

          <button onClick={() => router.push('/portal/provas')} className="bg-[#135bec] text-white px-6 py-2.5 rounded-xl text-sm font-semibold">
            Voltar às Provas
          </button>
        </div>
      </div>
    );
  }

  const questions = exam.questions;
  const question = questions[currentQuestion];
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = questions.length;

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-800">{exam.title}</h2>
          <p className="text-xs text-slate-400">{exam.discipline.name}</p>
        </div>
        <div className="flex items-center gap-4">
          {timeLeft !== null && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold ${
              timeLeft < 300 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-700'
            }`}>
              <span className="material-symbols-outlined text-sm">timer</span>
              {formatTime(timeLeft)}
            </div>
          )}
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Progresso</p>
            <p className="text-sm font-bold text-[#135bec]">{answeredCount}/{totalQuestions}</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#135bec] rounded-full transition-all duration-300"
          style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Question Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {questions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => setCurrentQuestion(i)}
            className={`w-10 h-10 rounded-xl text-sm font-bold flex-shrink-0 transition-all ${
              i === currentQuestion
                ? 'bg-[#135bec] text-white shadow-lg shadow-[#135bec]/25'
                : answers[q.id]
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Question */}
      {question && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-bold text-[#135bec] bg-[#135bec]/10 px-2 py-1 rounded-lg">
              Questão {currentQuestion + 1}
            </span>
            <span className="text-xs text-slate-400">
              Peso: {question.weight}
            </span>
          </div>

          <p className="text-slate-800 text-sm leading-relaxed mb-6 whitespace-pre-wrap">
            {question.statement}
          </p>

          <div className="space-y-3">
            {question.alternatives.map((alt) => {
              const isSelected = answers[question.id] === alt.id;
              return (
                <button
                  key={alt.id}
                  onClick={() => setAnswers(prev => ({ ...prev, [question.id]: alt.id }))}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3 ${
                    isSelected
                      ? 'border-[#135bec] bg-[#135bec]/5'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    isSelected
                      ? 'bg-[#135bec] text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {alt.letter}
                  </span>
                  <span className={`text-sm pt-1 ${isSelected ? 'text-[#135bec] font-medium' : 'text-slate-700'}`}>
                    {alt.text}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
          disabled={currentQuestion === 0}
          className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-30"
        >
          <span className="material-symbols-outlined text-sm">chevron_left</span>
          Anterior
        </button>

        {currentQuestion < totalQuestions - 1 ? (
          <button
            onClick={() => setCurrentQuestion(currentQuestion + 1)}
            className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#135bec] text-white hover:bg-[#0d47a1] transition-all"
          >
            Próxima
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={answeredCount < totalQuestions}
            className="flex items-center gap-1 px-6 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-sm">send</span>
            Finalizar Prova
          </button>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
            <span className="material-symbols-outlined text-4xl text-amber-500 mb-3">help</span>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Finalizar Prova?</h3>
            <p className="text-sm text-slate-500 mb-6">
              Você respondeu {answeredCount} de {totalQuestions} questões. 
              Após enviar, não será possível alterar suas respostas.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                {submitting ? 'Enviando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
