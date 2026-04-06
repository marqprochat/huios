'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const navItems = [
  { href: '/portal', icon: 'dashboard', label: 'Visão Geral' },
  { href: '/portal/aulas', icon: 'calendar_today', label: 'Aulas' },
  { href: '/portal/provas', icon: 'quiz', label: 'Provas' },
  { href: '/portal/boletim', icon: 'assessment', label: 'Boletim' },
  { href: '/portal/perfil', icon: 'person', label: 'Perfil' },
];

export default function PortalSidebar({ studentName, courseName }: { studentName: string; courseName: string }) {
  const pathname = usePathname();
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
    <aside className="w-[280px] flex-shrink-0 bg-white border-r border-slate-200 hidden lg:flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#135bec] rounded-xl flex items-center justify-center">
            <span className="text-white font-black text-sm">H</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#135bec] tracking-wide uppercase">Huios</h1>
            <p className="text-[10px] text-slate-400">Seminário Teológico</p>
          </div>
        </div>
      </div>

      {/* Student Info */}
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#135bec] to-[#0d47a1] flex items-center justify-center">
            <span className="text-white font-bold text-sm">{studentName.charAt(0)}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{studentName}</p>
            <p className="text-[11px] text-slate-400 truncate">{courseName}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-3">Menu Principal</p>
        {navItems.map((item) => {
          const isActive = item.href === '/portal' 
            ? pathname === '/portal' 
            : pathname.startsWith(item.href);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#135bec] text-white shadow-lg shadow-[#135bec]/25'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className={`material-symbols-outlined text-xl ${isActive ? 'text-white' : 'text-slate-400'}`}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}

        <div className="pt-4 mt-4 border-t border-slate-100">
          <Link
            href="/portal/checkin/hoje"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all"
          >
            <span className="material-symbols-outlined text-xl text-emerald-500">my_location</span>
            Check-in
          </Link>
        </div>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-slate-100">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-xl">logout</span>
          {loggingOut ? 'Saindo...' : 'Sair do Portal'}
        </button>
      </div>
    </aside>
  );
}
