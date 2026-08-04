import Link from 'next/link'

export default function AcessoNegadoPage() {
  return (
    <div className="flex min-h-full items-center justify-center p-6 lg:p-10">
      <section
        aria-labelledby="access-denied-title"
        className="w-full max-w-lg rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-sm dark:border-amber-900/60 dark:bg-slate-900"
      >
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
          <span className="material-symbols-outlined text-4xl" aria-hidden="true">
            lock
          </span>
        </div>

        <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
          Acesso restrito
        </p>
        <h1 id="access-denied-title" className="text-2xl font-black text-slate-900 dark:text-white">
          Você não tem permissão para acessar esta área
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Seu usuário não possui a permissão necessária para essa operação. Se você acredita que deveria ter acesso, solicite ao Super Admin a revisão da sua função.
        </p>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-opacity hover:opacity-90"
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">home</span>
            Voltar ao painel
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Trocar usuário
          </Link>
        </div>
      </section>
    </div>
  )
}
