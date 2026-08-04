'use client'

import { useTransition } from 'react';
import { resetTeamMemberPassword } from './actions';

const DEFAULT_PASSWORD = '123456789';

export function ResetPasswordButton({ id, name }: { id: string; name: string }) {
    const [isPending, startTransition] = useTransition();

    const handleReset = () => {
        if (confirm(`Redefinir a senha de ${name} para a senha padrao ${DEFAULT_PASSWORD}?\n\nO membro sera obrigado a trocar a senha no proximo acesso.`)) {
            startTransition(async () => {
                const result = await resetTeamMemberPassword(id, DEFAULT_PASSWORD);
                if (result.success) {
                    alert(`Senha redefinida para ${DEFAULT_PASSWORD}.`);
                } else {
                    alert(result.error);
                }
            });
        }
    };

    return (
        <button
            onClick={handleReset}
            disabled={isPending}
            className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-colors disabled:opacity-50"
            title="Redefinir senha"
        >
            <span className="material-symbols-outlined text-[20px]">
                {isPending ? 'hourglass_empty' : 'lock_reset'}
            </span>
        </button>
    );
}
