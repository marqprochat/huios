'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { createCoupon, updateCoupon, toggleCoupon, deleteCoupon } from './actions';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  isActive: boolean;
  waiveEnrollmentFee: boolean;
  discountType: 'PERCENT' | 'FIXED' | null;
  discountValue: number | null;
  discountMonths: number | null;
  validFrom: string | null;
  validUntil: string | null;
  maxUses: number | null;
  usedCount: number;
  onePerStudent: boolean;
  courseIds: string[];
  classIds: string[];
}

interface Option { id: string; name: string; courseName?: string }

interface Props {
  coupons: Coupon[];
  courses: Option[];
  classes: Option[];
}

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function describe(c: Coupon): string {
  const parts: string[] = [];
  if (c.waiveEnrollmentFee) parts.push('Isenta taxa de matrícula');
  if (c.discountType && c.discountValue) {
    const val = c.discountType === 'PERCENT' ? `${c.discountValue}%` : fmtBRL(c.discountValue);
    const janela = c.discountMonths && c.discountMonths > 0 ? ` (${c.discountMonths}x)` : ' (todas)';
    parts.push(`${val} de desconto${janela}`);
  }
  return parts.join(' + ') || 'Sem efeito';
}

const toInputDate = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');

export function CuponsClient({ coupons, courses, classes }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createCoupon(null, data);
      if (res.success) {
        setCreating(false);
        window.location.reload();
      } else {
        setMsg({ id: 'new', ok: false, text: res.message });
      }
    });
  };

  const handleUpdate = (id: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateCoupon(id, null, data);
      setMsg({ id, ok: res.success, text: res.message });
      if (res.success) {
        setEditing(null);
        window.location.reload();
      }
    });
  };

  const handleToggle = (c: Coupon) => {
    startTransition(async () => {
      await toggleCoupon(c.id, !c.isActive);
      window.location.reload();
    });
  };

  const handleDelete = (c: Coupon) => {
    if (!confirm(`Remover o cupom "${c.code}"?\nSe já tiver sido usado, ele será apenas desativado.`)) return;
    startTransition(async () => {
      await deleteCoupon(c.id);
      window.location.reload();
    });
  };

  return (
    <div className="max-w-[900px] mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/financeiro" className="text-slate-400 hover:text-primary transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Cupons</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Isenção de taxa de matrícula e/ou desconto nas mensalidades</p>
          </div>
        </div>
        <button
          onClick={() => { setCreating(true); setMsg(null); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-all"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Novo Cupom
        </button>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-slate-900 rounded-2xl border border-primary/30 p-5 space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-white">Novo Cupom</h3>
          <CouponFormFields courses={courses} classes={classes} />
          {msg?.id === 'new' && <p className={`text-xs font-bold ${msg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{msg.text}</p>}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setCreating(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">Cancelar</button>
            <button type="submit" disabled={isPending} className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 disabled:opacity-50">
              {isPending ? 'Salvando...' : 'Criar'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
        {coupons.length === 0 && (
          <div className="p-10 text-center text-slate-400">
            <span className="material-symbols-outlined text-4xl mb-2">sell</span>
            <p>Nenhum cupom cadastrado</p>
          </div>
        )}
        {coupons.map(c => (
          <div key={c.id} className="p-4">
            {editing === c.id ? (
              <form onSubmit={e => handleUpdate(c.id, e)} className="space-y-4">
                <CouponFormFields courses={courses} classes={classes} defaultValues={c} />
                {msg?.id === c.id && <p className={`text-xs font-bold ${msg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{msg.text}</p>}
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setEditing(null)} className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">Cancelar</button>
                  <button type="submit" disabled={isPending} className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold disabled:opacity-50">
                    {isPending ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-black text-slate-800 dark:text-white tracking-wide ${!c.isActive ? 'line-through text-slate-400' : ''}`}>
                      {c.code}
                    </span>
                    {!c.isActive && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-400">Inativo</span>}
                    {c.onePerStudent && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">1 por aluno</span>}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{describe(c)}</p>
                  {c.description && <p className="text-xs text-slate-400 mt-0.5">{c.description}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                    <span>Usos: {c.usedCount}{c.maxUses != null ? ` / ${c.maxUses}` : ''}</span>
                    {(c.validFrom || c.validUntil) && (
                      <span>
                        Validade: {c.validFrom ? new Date(c.validFrom).toLocaleDateString('pt-BR') : '—'}
                        {' até '}
                        {c.validUntil ? new Date(c.validUntil).toLocaleDateString('pt-BR') : '—'}
                      </span>
                    )}
                    {c.courseIds.length > 0 && <span>{c.courseIds.length} curso(s)</span>}
                    {c.classIds.length > 0 && <span>{c.classIds.length} turma(s)</span>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => handleToggle(c)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary transition-colors" title={c.isActive ? 'Desativar' : 'Ativar'}>
                    <span className="material-symbols-outlined text-sm">{c.isActive ? 'toggle_on' : 'toggle_off'}</span>
                  </button>
                  <button onClick={() => { setEditing(c.id); setMsg(null); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary transition-colors" title="Editar">
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                  <button onClick={() => handleDelete(c)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" title="Remover">
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CouponFormFields({
  courses,
  classes,
  defaultValues,
}: {
  courses: Option[];
  classes: Option[];
  defaultValues?: Coupon;
}) {
  const [discountType, setDiscountType] = useState<string>(defaultValues?.discountType ?? '');
  const field = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/30';
  const label = 'block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1';

  return (
    <div className="space-y-4">
      {/* isActive mantido estável; alternado pela lista */}
      <input type="hidden" name="isActive" value={defaultValues ? (defaultValues.isActive ? 'true' : 'false') : 'true'} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={label}>Código *</label>
          <input name="code" required defaultValue={defaultValues?.code ?? ''} className={`${field} uppercase font-bold tracking-wide`} placeholder="EX: BOLSA2026" />
        </div>
        <div>
          <label className={label}>Descrição (interna)</label>
          <input name="description" defaultValue={defaultValues?.description ?? ''} className={field} placeholder="Ex: Bolsa integral 2026" />
        </div>
      </div>

      {/* Efeitos */}
      <div className="rounded-xl border border-slate-100 dark:border-slate-800 p-3 space-y-3">
        <p className="text-xs font-black uppercase tracking-wider text-primary">Efeitos</p>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="waiveEnrollmentFee" value="true" defaultChecked={defaultValues?.waiveEnrollmentFee ?? false} className="rounded" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Isentar a taxa de matrícula</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={label}>Tipo de desconto</label>
            <select name="discountType" value={discountType} onChange={e => setDiscountType(e.target.value)} className={field}>
              <option value="">Sem desconto</option>
              <option value="PERCENT">Percentual (%)</option>
              <option value="FIXED">Valor fixo (R$)</option>
            </select>
          </div>
          <div>
            <label className={label}>{discountType === 'FIXED' ? 'Valor (R$)' : 'Valor (%)'}</label>
            <input name="discountValue" type="number" step="0.01" min="0" defaultValue={defaultValues?.discountValue ?? ''} disabled={!discountType} className={`${field} disabled:opacity-50`} placeholder={discountType === 'FIXED' ? '50,00' : '20'} />
          </div>
          <div>
            <label className={label}>Nº de mensalidades</label>
            <input name="discountMonths" type="number" min="0" defaultValue={defaultValues?.discountMonths ?? ''} disabled={!discountType} className={`${field} disabled:opacity-50`} placeholder="Vazio = todas" />
          </div>
        </div>
      </div>

      {/* Restrições */}
      <div className="rounded-xl border border-slate-100 dark:border-slate-800 p-3 space-y-3">
        <p className="text-xs font-black uppercase tracking-wider text-primary">Restrições</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={label}>Válido de</label>
            <input name="validFrom" type="date" defaultValue={toInputDate(defaultValues?.validFrom ?? null)} className={field} />
          </div>
          <div>
            <label className={label}>Válido até</label>
            <input name="validUntil" type="date" defaultValue={toInputDate(defaultValues?.validUntil ?? null)} className={field} />
          </div>
          <div>
            <label className={label}>Limite de usos</label>
            <input name="maxUses" type="number" min="1" defaultValue={defaultValues?.maxUses ?? ''} className={field} placeholder="Ilimitado" />
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="onePerStudent" value="true" defaultChecked={defaultValues?.onePerStudent ?? false} className="rounded" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Permitir apenas 1 uso por aluno</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={label}>Cursos (vazio = todos)</label>
            <div className="max-h-32 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 p-2 space-y-1">
              {courses.length === 0 && <p className="text-xs text-slate-400">Nenhum curso.</p>}
              {courses.map(c => (
                <label key={c.id} className="flex items-center gap-2 cursor-pointer text-xs">
                  <input type="checkbox" name="courseIds" value={c.id} defaultChecked={defaultValues?.courseIds?.includes(c.id) ?? false} className="rounded" />
                  <span className="text-slate-700 dark:text-slate-300">{c.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className={label}>Turmas (vazio = todas)</label>
            <div className="max-h-32 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 p-2 space-y-1">
              {classes.length === 0 && <p className="text-xs text-slate-400">Nenhuma turma.</p>}
              {classes.map(c => (
                <label key={c.id} className="flex items-center gap-2 cursor-pointer text-xs">
                  <input type="checkbox" name="classIds" value={c.id} defaultChecked={defaultValues?.classIds?.includes(c.id) ?? false} className="rounded" />
                  <span className="text-slate-700 dark:text-slate-300">{c.courseName ? `${c.courseName} — ` : ''}{c.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
