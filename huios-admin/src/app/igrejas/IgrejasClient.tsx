'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { createChurch, updateChurch, deleteChurch, regenerateChurchLink } from './actions';

interface Church {
  id: string;
  name: string;
  type: string;
  isPartner: boolean;
  publicSlug: string | null;
  isActive: boolean;
  enrollmentCount: number;
}

const TYPE_LABELS: Record<string, { label: string; cls: string }> = {
  SEDE: { label: 'Sede', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300' },
  PARCEIRA: { label: 'Parceira', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  EXTERNA: { label: 'Externa', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
};

export function IgrejasClient({ churches }: { churches: Church[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState<string | null>(null);

  const linkFor = (slug: string) =>
    typeof window !== 'undefined' ? `${window.location.origin}/matricula/${slug}` : `/matricula/${slug}`;

  const copyLink = (slug: string) => {
    navigator.clipboard?.writeText(linkFor(slug));
    setCopied(slug);
    setTimeout(() => setCopied(null), 1500);
  };

  const onCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createChurch(null, data);
      setMsg({ id: '__new__', ok: res.success, text: res.message });
      if (res.success) setCreating(false);
    });
  };

  const onUpdate = (id: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateChurch(id, null, data);
      setMsg({ id, ok: res.success, text: res.message });
      if (res.success) setEditing(null);
    });
  };

  const onDelete = (id: string) => {
    if (!confirm('Excluir/inativar esta igreja?')) return;
    startTransition(async () => { await deleteChurch(id); });
  };

  const onRegen = (id: string) => {
    startTransition(async () => {
      const res = await regenerateChurchLink(id);
      setMsg({ id, ok: res.success, text: res.message });
    });
  };

  const fieldCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/30';

  return (
    <div className="max-w-[900px] mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-slate-400 hover:text-primary transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Igrejas</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Sede, parceiras e externas. Parceiras geram link exclusivo de matrícula.</p>
          </div>
        </div>
        <button onClick={() => { setCreating(!creating); setEditing(null); }}
          className="bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20">
          <span className="material-symbols-outlined text-sm">{creating ? 'close' : 'add'}</span>
          {creating ? 'Cancelar' : 'Nova Igreja'}
        </button>
      </div>

      {creating && (
        <form onSubmit={onCreate} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Nome</label>
              <input name="name" required className={fieldCls} placeholder="Ex: Igreja Batista Central" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Tipo</label>
              <select name="type" defaultValue="EXTERNA" className={fieldCls}>
                <option value="SEDE">Sede (membros)</option>
                <option value="PARCEIRA">Parceira (link exclusivo)</option>
                <option value="EXTERNA">Externa</option>
              </select>
            </div>
          </div>
          {msg?.id === '__new__' && <p className={`text-xs font-bold ${msg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{msg.text}</p>}
          <div className="flex justify-end">
            <button type="submit" disabled={isPending} className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 disabled:opacity-50">
              {isPending ? 'Salvando...' : 'Cadastrar'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
        {churches.length === 0 && (
          <div className="p-10 text-center text-slate-400">
            <span className="material-symbols-outlined text-4xl mb-2">church</span>
            <p>Nenhuma igreja cadastrada</p>
          </div>
        )}
        {churches.map(ch => {
          const t = TYPE_LABELS[ch.type] ?? TYPE_LABELS.EXTERNA;
          const isOpen = editing === ch.id;
          return (
            <div key={ch.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-800 dark:text-white">{ch.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${t.cls}`}>{t.label}</span>
                    {!ch.isActive && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500">Inativa</span>}
                    <span className="text-xs text-slate-400">{ch.enrollmentCount} matrícula(s)</span>
                  </div>
                  {ch.isPartner && ch.publicSlug && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-slate-600 dark:text-slate-300 truncate max-w-[320px]">{linkFor(ch.publicSlug)}</code>
                      <button onClick={() => copyLink(ch.publicSlug!)} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">{copied === ch.publicSlug ? 'check' : 'content_copy'}</span>
                        {copied === ch.publicSlug ? 'Copiado' : 'Copiar'}
                      </button>
                      <button onClick={() => onRegen(ch.id)} disabled={isPending} className="text-xs font-bold text-slate-400 hover:text-amber-600 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">autorenew</span>Novo link
                      </button>
                    </div>
                  )}
                  {msg?.id === ch.id && <p className={`text-xs font-bold mt-1 ${msg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{msg.text}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditing(isOpen ? null : ch.id); setCreating(false); }} className="text-slate-400 hover:text-primary transition-colors" title="Editar">
                    <span className="material-symbols-outlined text-xl">{isOpen ? 'close' : 'edit'}</span>
                  </button>
                  <button onClick={() => onDelete(ch.id)} className="text-slate-400 hover:text-red-500 transition-colors" title="Excluir">
                    <span className="material-symbols-outlined text-xl">delete</span>
                  </button>
                </div>
              </div>

              {isOpen && (
                <form onSubmit={e => onUpdate(ch.id, e)} className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Nome</label>
                      <input name="name" required defaultValue={ch.name} className={fieldCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Tipo</label>
                      <select name="type" defaultValue={ch.type} className={fieldCls}>
                        <option value="SEDE">Sede (membros)</option>
                        <option value="PARCEIRA">Parceira (link exclusivo)</option>
                        <option value="EXTERNA">Externa</option>
                      </select>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input name="isActive" type="checkbox" value="true" defaultChecked={ch.isActive} className="rounded" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Ativa</span>
                  </label>
                  <div className="flex justify-end">
                    <button type="submit" disabled={isPending} className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 disabled:opacity-50">
                      {isPending ? 'Salvando...' : 'Salvar'}
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
