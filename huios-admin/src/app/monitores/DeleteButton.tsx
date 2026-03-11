'use client'

import { useTransition } from 'react';
import { deleteMonitor } from './actions';

export function DeleteButton({ id }: { id: string }) {
    const [isPending, startTransition] = useTransition();

    const handleDelete = () => {
        if (window.confirm('Tem certeza que deseja excluir este monitor? Esta ação não pode ser desfeita.')) {
            startTransition(() => {
                deleteMonitor(id);
            });
        }
    };

    return (
        <button 
            onClick={handleDelete}
            disabled={isPending}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
            title="Excluir"
        >
            <span className="material-symbols-outlined text-[20px]">
                {isPending ? 'hourglass_empty' : 'delete'}
            </span>
        </button>
    );
}
