'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { createCategory, updateCategory, deleteCategory } from '../actions';

interface Category {
  id: string;
  name: string;
  type: 'RECEITA' | 'DESPESA' | null;
  color: string | null;
  isDefault: boolean;
  isActive: boolean;
}

interface Props { categories: Category[] }

const TYPE_LABEL: Record<string, string> = {
  RECEITA: 'Receita',
  DESPESA: 'Despesa',
};

const TYPE_COLOR: Record<string, string> = {
  RECEITA: 'bg-emerald-100 text-emerald-700',
  DESPESA: 'bg-red-100 text-red-700',
};

export function CategoriasClient({ categories: initial }: Props) {
  const [categories, setCategories] = useState(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createCategory(null, data);
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
      const res = await updateCategory(id, null, data);
      setMsg({ id, ok: res.success, text: res.message });
      if (res.success) {
        setEditing(null);
        window.location.reload();
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Remover categoria "${name}"?\nSe ela tiver lançamentos vinculados, será apenas desativada.`)) return;
    startTransition(async () => {
      await deleteCategory(id);
      window.location.reload();
    });
  };

  return (
    <div className="max-w-[800px] mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/financeiro" className="text-slate-400 hover:text-primary transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Categorias</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Gerencie as categorias de receitas e despesas</p>
          </div>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-all"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Nova Categoria
        </button>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-slate-900 rounded-2xl border border-primary/30 p-5 space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-white">Nova Categoria</h3>
          <CategoryFormFields />
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
        {categories.length === 0 && (
          <div className="p-10 text-center text-slate-400">
            <span className="material-symbols-outlined text-4xl mb-2">label</span>
            <p>Nenhuma categoria cadastrada</p>
          </div>
        )}
        {categories.map(cat => (
          <div key={cat.id} className="p-4">
            {editing === cat.id ? (
              <form onSubmit={e => handleUpdate(cat.id, e)} className="space-y-3">
                <CategoryFormFields defaultValues={cat} />
                {msg?.id === cat.id && <p className={`text-xs font-bold ${msg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{msg.text}</p>}
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setEditing(null)} className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">Cancelar</button>
                  <button type="submit" disabled={isPending} className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold disabled:opacity-50">
                    {isPending ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color ?? '#6b7280' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium text-slate-800 dark:text-white ${!cat.isActive ? 'line-through text-slate-400' : ''}`}>
                      {cat.name}
                    </span>
                    {cat.type ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${TYPE_COLOR[cat.type]}`}>{TYPE_LABEL[cat.type]}</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500">Ambos</span>
                    )}
                    {cat.isDefault && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">Padrão</span>}
                    {!cat.isActive && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-400">Inativo</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditing(cat.id)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary transition-colors"
                    title="Editar"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                  {!cat.isDefault && (
                    <button
                      onClick={() => handleDelete(cat.id, cat.name)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                      title="Remover"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryFormFields({ defaultValues }: { defaultValues?: Partial<{ name: string; type: string | null; color: string | null; isActive: boolean }> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div>
        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Nome *</label>
        <input name="name" required defaultValue={defaultValues?.name ?? ''} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/30" placeholder="Ex: Mensalidade" />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Tipo</label>
        <select name="type" defaultValue={defaultValues?.type ?? ''} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">Ambos</option>
          <option value="RECEITA">Receita</option>
          <option value="DESPESA">Despesa</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Cor</label>
        <div className="flex items-center gap-2">
          <input name="color" type="color" defaultValue={defaultValues?.color ?? '#6b7280'} className="w-10 h-9 rounded-lg border border-slate-200 cursor-pointer" />
          <span className="text-xs text-slate-400">Clique para escolher</span>
        </div>
      </div>
      {defaultValues !== undefined && (
        <div className="sm:col-span-3 flex items-center gap-2">
          <input name="isActive" type="hidden" value={defaultValues?.isActive ? 'true' : 'false'} />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              defaultChecked={defaultValues?.isActive ?? true}
              onChange={e => {
                const form = e.currentTarget.closest('form');
                if (form) {
                  const hidden = form.querySelector('input[name="isActive"]') as HTMLInputElement;
                  if (hidden) hidden.value = e.target.checked ? 'true' : 'false';
                }
              }}
              className="rounded"
            />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Ativo</span>
          </label>
        </div>
      )}
    </div>
  );
}
