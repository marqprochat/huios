'use client'

import { useState } from 'react';

export function PublicEnrollLink() {
    const [copied, setCopied] = useState(false);
    const url = typeof window !== 'undefined' ? `${window.location.origin}/matricula` : '/matricula';

    const copy = () => {
        navigator.clipboard?.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2">
            <span className="material-symbols-outlined text-[18px] text-slate-400">link</span>
            <code className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[200px]">{url}</code>
            <button onClick={copy} className="text-xs font-bold text-primary hover:underline flex items-center gap-1 whitespace-nowrap">
                <span className="material-symbols-outlined text-[14px]">{copied ? 'check' : 'content_copy'}</span>
                {copied ? 'Copiado' : 'Copiar'}
            </button>
            <a href="/matricula" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-slate-400 hover:text-primary flex items-center gap-1 whitespace-nowrap" title="Abrir página de matrícula">
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>
        </div>
    );
}
