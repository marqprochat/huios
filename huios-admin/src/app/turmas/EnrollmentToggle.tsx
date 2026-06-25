'use client'

import { useTransition } from 'react';
import { setEnrollmentStatus } from './actions';

export function EnrollmentToggle({ id, status }: { id: string; status: string }) {
    const [isPending, startTransition] = useTransition();
    const isOpen = status === 'ABERTA';

    const handleToggle = () => {
        const next = isOpen ? 'FECHADA' : 'ABERTA';
        startTransition(async () => {
            const result = await setEnrollmentStatus(id, next);
            if (result && !result.success) alert(result.error);
        });
    };

    return (
        <div className="flex items-center gap-2">
            <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                    isOpen
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
            >
                <span className="material-symbols-outlined text-[14px]">{isOpen ? 'lock_open' : 'lock'}</span>
                {isOpen ? 'Aberta' : 'Fechada'}
            </span>
            <button
                onClick={handleToggle}
                disabled={isPending}
                className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50 ${
                    isOpen
                        ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10'
                        : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                }`}
                title={isOpen ? 'Fechar matrícula' : 'Abrir matrícula'}
            >
                {isPending ? '...' : isOpen ? 'Fechar' : 'Abrir'}
            </button>
        </div>
    );
}
