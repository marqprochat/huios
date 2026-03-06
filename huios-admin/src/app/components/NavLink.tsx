'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({ href, icon, label }: { href: string; icon: string; label: string }) {
    const pathname = usePathname();
    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));

    return (
        <Link
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
        >
            <span className={`material-symbols-outlined ${isActive ? 'fill-1' : ''}`}>{icon}</span>
            <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>{label}</span>
        </Link>
    );
}
