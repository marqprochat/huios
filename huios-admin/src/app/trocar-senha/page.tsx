'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ChangePasswordPage() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError('');

        if (!currentPassword || !newPassword || !confirmPassword) {
            setError('Preencha todos os campos.');
            return;
        }

        if (newPassword.length < 8) {
            setError('A nova senha deve ter pelo menos 8 caracteres.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('A confirmação da nova senha não confere.');
            return;
        }

        if (newPassword === currentPassword) {
            setError('A nova senha deve ser diferente da senha atual.');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                    confirmPassword,
                }),
            });
            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Não foi possível alterar a senha.');
                return;
            }

            router.replace(data.isAdmin ? '/' : '/portal');
            router.refresh();
        } catch {
            setError('Erro de conexão. Tente novamente.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center overflow-y-auto bg-gradient-to-br from-slate-100 via-primary/5 to-slate-200 p-4 dark:from-slate-950 dark:via-primary/5 dark:to-slate-950">
            <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/logo completa.png"
                        alt="Huios Seminário Teológico"
                        className="mx-auto h-28 object-contain"
                    />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-6">
                        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                            Crie uma nova senha
                        </h1>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            Por segurança, altere sua senha temporária antes de continuar.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div
                                role="alert"
                                className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
                            >
                                <span className="material-symbols-outlined text-lg">
                                    error
                                </span>
                                {error}
                            </div>
                        )}

                        <PasswordField
                            id="current-password"
                            label="Senha atual"
                            value={currentPassword}
                            onChange={setCurrentPassword}
                            autoComplete="current-password"
                        />
                        <PasswordField
                            id="new-password"
                            label="Nova senha"
                            value={newPassword}
                            onChange={setNewPassword}
                            autoComplete="new-password"
                            hint="Use pelo menos 8 caracteres."
                        />
                        <PasswordField
                            id="confirm-password"
                            label="Confirme a nova senha"
                            value={confirmPassword}
                            onChange={setConfirmPassword}
                            autoComplete="new-password"
                        />

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/50"
                        >
                            {loading ? 'Alterando senha...' : 'Salvar nova senha'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

function PasswordField({
    id,
    label,
    value,
    onChange,
    autoComplete,
    hint,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    autoComplete: string;
    hint?: string;
}) {
    return (
        <div>
            <label
                htmlFor={id}
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
                {label}
            </label>
            <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-xl text-slate-400">
                    lock
                </span>
                <input
                    id={id}
                    type="password"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    autoComplete={autoComplete}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
            </div>
            {hint && (
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    {hint}
                </p>
            )}
        </div>
    );
}
