'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function PortalHeader({ studentName }: { studentName: string }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/portal/login');
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  return (
    <header className="bg-white border-b border-slate-200 px-4 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-40">
      {/* Mobile logo */}
      <div className="flex items-center gap-3 lg:hidden">
        <div className="w-9 h-9 bg-[#135bec] rounded-xl flex items-center justify-center">
          <span className="text-white font-black text-xs">H</span>
        </div>
        <div>
          <h1 className="text-xs font-bold text-[#135bec] tracking-wide uppercase">Huios</h1>
          <p className="text-[9px] text-slate-400">Portal do Aluno</p>
        </div>
      </div>

      {/* Desktop: page title area */}
      <div className="hidden lg:block" />

      {/* Right side */}
      <div className="flex items-center gap-3">
        <button className="relative p-2 hover:bg-slate-50 rounded-xl transition-colors">
          <span className="material-symbols-outlined text-slate-400">notifications</span>
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <div className="hidden md:flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#135bec] to-[#0d47a1] flex items-center justify-center">
            <span className="text-white font-bold text-xs">{studentName.charAt(0)}</span>
          </div>
          <span className="text-sm font-medium text-slate-700">{studentName}</span>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          title="Sair do portal"
          className="p-2 hover:bg-red-50 rounded-xl transition-colors text-slate-400 hover:text-red-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined">{loggingOut ? 'hourglass_empty' : 'logout'}</span>
        </button>
      </div>
    </header>
  );
}
