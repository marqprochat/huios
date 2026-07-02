'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toLocalDate } from '@/lib/date-utils';

interface Turma {
  id: string;
  name: string;
  courseName: string;
  courseDescription: string | null;
  courseImageUrl: string | null;
  startDate: string | null;
  duration: string | null;
}

interface Success {
  courseName: string;
  className: string;
  monthlyAmount: number;
  discountedMonthlyAmount: number;
  appliedCouponCode: string | null;
  alreadyEnrolled: boolean;
  transactionId: string | null;
  amount: number | null;
}

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (iso: string | null) =>
  iso ? toLocalDate(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : null;

export default function PortalMatriculaPage() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<Success | null>(null);
  const [coupons, setCoupons] = useState<Record<string, string>>({});

  const fetchTurmas = async () => {
    try {
      const res = await fetch('/api/portal/matricula');
      if (res.ok) {
        const d = await res.json();
        setTurmas(d.turmas || []);
      }
    } catch {
      /* silencioso */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTurmas();
  }, []);

  const enroll = async (t: Turma) => {
    setError(null);
    setEnrollingId(t.id);
    try {
      const res = await fetch('/api/portal/matricula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: t.id, couponCode: coupons[t.id]?.trim() || null }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Erro ao matricular.');
      setSuccess({
        courseName: t.courseName,
        className: t.name,
        monthlyAmount: d.monthlyAmount ?? 0,
        discountedMonthlyAmount: d.discountedMonthlyAmount ?? d.monthlyAmount ?? 0,
        appliedCouponCode: d.appliedCouponCode ?? null,
        alreadyEnrolled: !!d.alreadyEnrolled,
        transactionId: d.transactionId ?? null,
        amount: d.amount ?? null,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setEnrollingId(null);
    }
  };

  if (success) {
    return (
      <div className="max-w-[720px] mx-auto p-4 lg:p-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-3xl">check_circle</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            {success.alreadyEnrolled ? 'Você já está matriculado' : 'Matrícula realizada!'}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {success.courseName} · {success.className}
          </p>
          {!success.alreadyEnrolled && (
            <p className="text-sm text-slate-500 mt-3">
              Mensalidade:{' '}
              {success.appliedCouponCode && success.discountedMonthlyAmount < success.monthlyAmount ? (
                <>
                  <span className="line-through text-slate-400">{fmtBRL(success.monthlyAmount)}</span>{' '}
                  <span className="font-bold text-emerald-600">{fmtBRL(success.discountedMonthlyAmount)}</span>
                </>
              ) : (
                <span className="font-bold text-slate-800">{fmtBRL(success.monthlyAmount)}</span>
              )}
            </p>
          )}
          {success.appliedCouponCode && (
            <p className="text-xs font-bold text-emerald-600 mt-1 inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">sell</span>
              Cupom {success.appliedCouponCode} aplicado
            </p>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            {success.transactionId ? (
              <Link
                href={`/matricula/pagamento/${success.transactionId}?retorno=/portal/financeiro`}
                className="bg-[#135bec] text-white px-5 py-3 rounded-xl text-sm font-bold hover:opacity-90"
              >
                Pagar {success.amount != null ? fmtBRL(success.amount) : 'primeira mensalidade'}
              </Link>
            ) : (
              <Link
                href="/portal/financeiro"
                className="bg-[#135bec] text-white px-5 py-3 rounded-xl text-sm font-bold hover:opacity-90"
              >
                Ver financeiro
              </Link>
            )}
            <Link
              href="/portal"
              className="px-5 py-3 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200"
            >
              Voltar ao início
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto p-4 lg:p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Matrículas abertas</h2>
        <p className="text-slate-500 text-sm">Matricule-se em uma nova turma com inscrições abertas.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm font-bold text-red-600">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="material-symbols-outlined animate-spin text-[#135bec]">refresh</span>
        </div>
      ) : turmas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">event_busy</span>
          <h3 className="text-lg font-bold text-slate-800">Nenhuma turma disponível no momento</h3>
          <p className="text-slate-500 text-sm mt-1">
            Você já está matriculado em todas as turmas abertas ou não há inscrições abertas agora.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {turmas.map(t => (
            <div
              key={t.id}
              className="rounded-2xl border border-slate-200 bg-white overflow-hidden hover:border-[#135bec] hover:shadow-xl transition-all flex items-stretch"
            >
              <div className="shrink-0 self-stretch w-28 sm:w-36 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
                {t.courseImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.courseImageUrl} alt={t.courseName} className="w-full aspect-square object-contain" />
                ) : (
                  <span className="material-symbols-outlined text-5xl text-slate-300">menu_book</span>
                )}
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-bold text-slate-900 text-lg leading-snug">{t.courseName}</h3>
                <p className="text-sm font-bold text-[#135bec]">{t.name}</p>
                {t.courseDescription && (
                  <p className="text-sm text-slate-500 mt-2 line-clamp-2">{t.courseDescription}</p>
                )}
                <div className="flex flex-wrap gap-3 mt-4 text-xs text-slate-500">
                  {fmtDate(t.startDate) && (
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                      Início {fmtDate(t.startDate)}
                    </span>
                  )}
                  {t.duration && (
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">schedule</span>
                      {t.duration}
                    </span>
                  )}
                </div>
                <input
                  value={coupons[t.id] ?? ''}
                  onChange={e => setCoupons(c => ({ ...c, [t.id]: e.target.value.toUpperCase() }))}
                  className="mt-5 w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm uppercase outline-none focus:ring-2 focus:ring-[#135bec]/30"
                  placeholder="Cupom de desconto (opcional)"
                />
                <button
                  onClick={() => enroll(t)}
                  disabled={enrollingId !== null}
                  className="mt-3 w-full text-center bg-[#135bec] text-white py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {enrollingId === t.id ? 'Matriculando...' : 'Matricular nesta turma'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
