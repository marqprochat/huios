"use client";

import { ThemeToggle } from "./ThemeToggle";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface UserData {
    userId: string;
    name: string;
    email: string;
    role: string;
}

interface HeaderProps {
    user?: UserData | null;
    onLogout?: () => void;
}

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
    relatedId: string | null;
}

export function Header({ user, onLogout }: HeaderProps) {
    const initials = user?.name
        ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        : 'A';

    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [open, setOpen] = useState(false);
    const [loadingNotifs, setLoadingNotifs] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const fetchUnreadCount = async () => {
        try {
            const res = await fetch('/api/admin/notificacoes?unreadOnly=true');
            if (res.ok) {
                const data = await res.json();
                setUnreadCount(data.unreadCount || 0);
            }
        } catch {}
    };

    const fetchNotifications = async () => {
        setLoadingNotifs(true);
        try {
            const res = await fetch('/api/admin/notificacoes');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch {}
        setLoadingNotifs(false);
    };

    const handleBellClick = () => {
        const next = !open;
        setOpen(next);
        if (next) fetchNotifications();
    };

    const markRead = async (id: string) => {
        try {
            await fetch(`/api/admin/notificacoes/${id}`, { method: 'PUT' });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch {}
    };

    const typeIcon: Record<string, string> = {
        JUSTIFICATION_SUBMITTED: 'upload_file',
        ABSENCE_PENDING_JUSTIFICATION: 'warning',
        AUTO_FAILED: 'cancel',
        JUSTIFICATION_REVIEWED: 'rate_review'
    };

    const formatRelative = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (mins < 1) return 'agora mesmo';
        if (mins < 60) return `há ${mins} min`;
        if (hours < 24) return `há ${hours}h`;
        return `há ${days}d`;
    };

    return (
        <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
            <div className="flex items-center gap-4 flex-1">
                <button className="md:hidden p-2 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                    <span className="material-symbols-outlined">menu</span>
                </button>
                <div className="relative max-w-md w-full hidden sm:block">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                    <input className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl pl-10 h-10 text-sm focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-slate-100 outline-none" placeholder="Pesquisar no sistema..." type="text" />
                </div>
            </div>

            <div className="flex items-center gap-4">
                <ThemeToggle />

                {/* Notificações */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={handleBellClick}
                        className="relative p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center"
                    >
                        <span className="material-symbols-outlined">notifications</span>
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-1 border-2 border-white dark:border-slate-900">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {open && (
                        <div className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">Notificações</p>
                                {unreadCount > 0 && (
                                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                        {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>

                            <div className="max-h-96 overflow-y-auto">
                                {loadingNotifs ? (
                                    <div className="flex items-center justify-center py-8">
                                        <span className="material-symbols-outlined animate-spin text-primary">refresh</span>
                                    </div>
                                ) : notifications.length === 0 ? (
                                    <div className="py-8 text-center">
                                        <span className="material-symbols-outlined text-3xl text-slate-300">notifications_off</span>
                                        <p className="text-sm text-slate-400 mt-2">Nenhuma notificação</p>
                                    </div>
                                ) : (
                                    notifications.map(notif => (
                                        <div
                                            key={notif.id}
                                            onClick={() => !notif.read && markRead(notif.id)}
                                            className={`px-4 py-3 border-b border-slate-50 dark:border-slate-800 last:border-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${!notif.read ? 'bg-primary/3' : ''}`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${!notif.read ? 'bg-primary/15' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                                    <span className={`material-symbols-outlined text-sm ${!notif.read ? 'text-primary' : 'text-slate-400'}`}>
                                                        {typeIcon[notif.type] || 'info'}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-xs font-semibold truncate ${!notif.read ? 'text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>
                                                        {notif.title}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
                                                        {notif.message}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 mt-1">{formatRelative(notif.createdAt)}</p>
                                                </div>
                                                {!notif.read && (
                                                    <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1"></span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
                                <Link
                                    href="/pendencias"
                                    onClick={() => setOpen(false)}
                                    className="block text-center text-xs font-semibold text-primary hover:underline"
                                >
                                    Ver todas as pendências →
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                <button className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg hidden sm:flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined">help_outline</span>
                </button>

                <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2 hidden sm:block"></div>

                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{user?.name || 'Coordenação'}</p>
                        <p className="text-[10px] text-slate-500">Online</p>
                    </div>
                    <div className="w-10 h-10 rounded-full border-2 border-primary/20 overflow-hidden bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {initials}
                    </div>
                </div>

                {onLogout && (
                    <button
                        onClick={onLogout}
                        title="Sair do sistema"
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                    >
                        <span className="material-symbols-outlined">logout</span>
                    </button>
                )}
            </div>
        </header>
    );
}
