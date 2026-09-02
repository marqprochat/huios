'use client';

import Link from 'next/link';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ProvasError({ error, reset }: Props) {
  return (
    <div className="mx-auto max-w-2xl p-4 lg:p-8">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/20 lg:p-8">
        <span className="material-symbols-outlined text-3xl text-red-500">error</span>
        <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white">
          Não foi possível concluir esta ação
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {error.message || 'Ocorreu um erro ao processar a prova. Tente novamente.'}
        </p>
        {error.digest && (
          <p className="mt-1 text-xs text-slate-400">Código do erro: {error.digest}</p>
        )}
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
          >
            Tentar novamente
          </button>
          <Link
            href="/provas"
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white"
          >
            Voltar para provas
          </Link>
        </div>
      </div>
    </div>
  );
}
