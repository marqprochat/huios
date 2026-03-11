'use client'

import { useTransition } from 'react';
import { deleteAluno } from './actions';

export function DeleteButton({ id }: { id: string }) {
    const [isPending, startTransition] = useTransition();

    const handleDelete = () => {
        if (window.confirm('Tem certeza que deseja excluir este aluno? Esta ação não pode ser desfeita.')) {
            startTransition(() => {
                deleteAluno(id);
            });
        }
    };

    return (
        <button 
            onClick={handleDelete}
            disabled={isPending}
            className="text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
            title="Excluir Aluno"
        >
            <span className="material-symbols-outlined text-xl">
                {isPending ? 'hourglass_empty' : 'delete'}
            </span>
        </button>
    );
}
