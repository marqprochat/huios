'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFinanceSummary } from './PortalShell';

const navItems = [
  { href: '/portal', icon: 'dashboard', label: 'Início' },
  { href: '/portal/aulas', icon: 'calendar_today', label: 'Aulas' },
  { href: '/portal/provas', icon: 'quiz', label: 'Provas' },
  { href: '/portal/financeiro', icon: 'payments', label: 'Financeiro' },
  { href: '/portal/avaliacoes', icon: 'rate_review', label: 'Avaliações' },
  { href: '/portal/perfil', icon: 'person', label: 'Perfil' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const finance = useFinanceSummary();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 lg:hidden z-50 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const isActive = item.href === '/portal'
            ? pathname === '/portal'
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center gap-0.5 px-1.5 py-2 rounded-xl text-[9px] font-semibold transition-all ${
                isActive
                  ? 'text-[#135bec]'
                  : 'text-slate-400'
              }`}
            >
              <span className={`material-symbols-outlined text-xl ${isActive ? 'text-[#135bec]' : ''}`}>
                {item.icon}
              </span>
              {item.href === '/portal/financeiro' && finance && finance.pendingCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[8px] font-bold bg-red-500 text-white">
                  {finance.pendingCount}
                </span>
              )}
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
