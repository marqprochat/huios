'use client';

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

interface NavSubLink {
    href: string;
    icon: string;
    label: string;
}

interface NavGroupProps {
    label: string;
    icon: string;
    links: NavSubLink[];
}

export default function NavGroup({ label, icon, links }: NavGroupProps) {
    const pathname = usePathname();
    const isAnyActive = links.some(link => pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href)));
    const [isOpen, setIsOpen] = useState(isAnyActive);

    // Sync open state with pathname if a sublink becomes active
    useEffect(() => {
        if (isAnyActive) {
            setIsOpen(true);
        }
    }, [isAnyActive]);

    return (
        <div className="flex flex-col">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`group flex items-center justify-between w-full px-3 py-2.5 rounded-xl transition-all duration-300 cursor-pointer ${isAnyActive
                    ? 'bg-primary/8 text-primary shadow-sm ring-1 ring-primary/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
            >
                <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined transition-transform duration-300 ${isAnyActive ? 'fill-1 scale-110' : 'group-hover:scale-110'}`}>
                        {icon}
                    </span>
                    <span className={`text-sm tracking-wide ${isAnyActive ? 'font-bold' : 'font-semibold'}`}>
                        {label}
                    </span>
                </div>
                <span className={`material-symbols-outlined text-lg transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : 'text-slate-400'}`}>
                    expand_more
                </span>
            </button>

            <div 
                className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'}`}
            >
                <div className="overflow-hidden">
                    <div className="ml-5 pl-4 border-l-2 border-slate-100 dark:border-slate-800/50 flex flex-col gap-1.5 pb-2">
                        {links.map((link) => {
                            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`group flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 relative ${isActive
                                        ? 'text-primary font-bold bg-primary/5'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                    }`}
                                >
                                    {isActive && (
                                        <div className="absolute left-[-18px] w-1.5 h-6 bg-primary rounded-r-full" />
                                    )}
                                    <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${isActive ? 'fill-1 scale-110' : 'group-hover:scale-110 opacity-70'}`}>
                                        {link.icon}
                                    </span>
                                    <span className="text-sm font-medium">{link.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
