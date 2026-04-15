'use client'

import { useTransition } from 'react';
import { deleteDiscipline } from './actions';

export function DeleteButton({ id }: { id: string }) {
    const [isPending, startTransition] = useTransition();

    const handleDelete = () => {
        if (window.confirm('Tem certeza que deseja excluir esta disciplina? Esta ação não pode ser desfeita.')) {
            startTransition(async () => {
                const result = await deleteDiscipline(id);
                if (result && !result.success) {
                    alert(result.error);
                }
            });
        }
    };

    return (
        <button 
            onClick={handleDelete}
            disabled={isPending}
            className="text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
            title="Excluir Disciplina"
        >
            <span className="material-symbols-outlined text-xl">
                {isPending ? 'hourglass_empty' : 'delete'}
            </span>
        </button>
    );
}
