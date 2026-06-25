'use client';

import { useState, useTransition, useRef } from 'react';
import Link from 'next/link';
import { upsertCoursePrice } from '../actions';

interface CoursePrice {
  id: string;
  amount: number;
  description: string | null;
  isActive: boolean;
  enrollmentFee: number | null;
  amountMember: number | null;
  amountNonMember: number | null;
  amountFamily: number | null;
  amountPartner: number | null;
}

interface Course {
  id: string;
  name: string;
  description: string | null;
  status: string;
  coursePrice: CoursePrice | null;
}

interface Props { courses: Course[] }

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function PrecosCursosClient({ courses }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [result, setResult] = useState<{ courseId: string; ok: boolean; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRefs = useRef<Record<string, HTMLFormElement | null>>({});

  const handleSubmit = (courseId: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      const res = await upsertCoursePrice(courseId, null, data);
      setResult({ courseId, ok: res.success, msg: res.message });
      if (res.success) setEditing(null);
    });
  };

  return (
    <div className="max-w-[900px] mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/financeiro" className="text-slate-400 hover:text-primary transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Preços dos Cursos</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Defina o valor de cada curso (R$ 0 = gratuito)</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
        {courses.length === 0 && (
          <div className="p-10 text-center text-slate-400">
            <span className="material-symbols-outlined text-4xl mb-2">menu_book</span>
            <p>Nenhum curso ativo encontrado</p>
          </div>
        )}
        {courses.map(course => {
          const price = course.coursePrice;
          const isFree = !price || price.amount === 0;
          const isOpen = editing === course.id;

          return (
            <div key={course.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-800 dark:text-white">{course.name}</span>
                    {isFree
                      ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">Gratuito</span>
                      : <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{fmt(price!.amount)}</span>
                    }
                    {price && !price.isActive && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500">Inativo</span>
                    )}
                  </div>
                  {price?.description && <p className="text-xs text-slate-400 mt-0.5">{price.description}</p>}
                </div>
                <button
                  onClick={() => setEditing(isOpen ? null : course.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:border-primary hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">{isOpen ? 'close' : 'edit'}</span>
                  {isOpen ? 'Cancelar' : 'Editar'}
                </button>
              </div>

              {isOpen && (
                <form
                  ref={el => { formRefs.current[course.id] = el; }}
                  onSubmit={e => handleSubmit(course.id, e)}
                  className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Valor base / padrão (R$)</label>
                      <input
                        name="amount"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={price?.amount ?? 0}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="0.00"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Fallback quando um nível abaixo ficar vazio. 0 = gratuito.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Taxa de matrícula (R$)</label>
                      <input
                        name="enrollmentFee"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={price?.enrollmentFee ?? ''}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="Opcional"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Cobrança única no ato da matrícula.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Descrição</label>
                      <input
                        name="description"
                        type="text"
                        defaultValue={price?.description ?? ''}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="Ex: Mensal, por disciplina..."
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Mensalidade por categoria</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Membro da sede</label>
                        <input name="amountMember" type="number" min="0" step="0.01" defaultValue={price?.amountMember ?? ''} placeholder="R$"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Não-membro</label>
                        <input name="amountNonMember" type="number" min="0" step="0.01" defaultValue={price?.amountNonMember ?? ''} placeholder="R$"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Família (2+)</label>
                        <input name="amountFamily" type="number" min="0" step="0.01" defaultValue={price?.amountFamily ?? ''} placeholder="R$"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Parceira (3+)</label>
                        <input name="amountPartner" type="number" min="0" step="0.01" defaultValue={price?.amountPartner ?? ''} placeholder="R$"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">Deixe vazio para usar o valor base. Aplica-se o menor preço elegível ao aluno.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        name="isActive"
                        type="checkbox"
                        value="true"
                        defaultChecked={price?.isActive ?? true}
                        className="rounded"
                        onChange={e => {
                          if (formRefs.current[course.id]) {
                            const hidden = formRefs.current[course.id]!.querySelector('input[name="isActive"][type="hidden"]') as HTMLInputElement | null;
                            if (hidden) hidden.value = e.target.checked ? 'true' : 'false';
                          }
                        }}
                      />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Ativo (gera cobranças automáticas)</span>
                    </label>
                  </div>

                  {result?.courseId === course.id && (
                    <p className={`text-xs font-bold ${result.ok ? 'text-emerald-600' : 'text-red-600'}`}>{result.msg}</p>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-sm">save</span>
                      {isPending ? 'Salvando...' : 'Salvar Preço'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
