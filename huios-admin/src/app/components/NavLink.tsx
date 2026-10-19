'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({ 
    href, 
    icon, 
    label, 
    isExpanded = true 
}: { 
    href: string; 
    icon: string; 
    label: string; 
    isExpanded?: boolean;
}) {
    const pathname = usePathname();
    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));

    return (
        <Link
            href={href}
            title={!isExpanded ? label : undefined}
            className={`flex items-center ${
                isExpanded ? 'gap-3 px-3 justify-start' : 'justify-center px-0'
            } py-2.5 rounded-xl transition-all duration-200 ${isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                }`}
        >
            <span className={`material-symbols-outlined flex-shrink-0 text-[22px] ${isActive ? 'fill-1' : ''}`}>{icon}</span>
            {isExpanded && (
                <span className="text-sm whitespace-nowrap overflow-hidden transition-all duration-300">
                    {label}
                </span>
            )}
        </Link>
    );
}
