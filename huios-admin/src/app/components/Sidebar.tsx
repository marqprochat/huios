"use client"

import Link from "next/link";
import NavLink from "./NavLink";
import NavGroup from "./NavGroup";

const ROLE_LABELS: Record<string, string> = {
    SUPER_ADMIN: "Super Admin",
    COORDENADOR: "Coordenador",
    MONITOR: "Monitor",
    ALUNO: "Aluno",
};

interface UserData {
    userId: string;
    name: string;
    email: string;
    role: string;
}

interface SidebarProps {
    user: UserData | null;
    onLogout: () => void;
}

export function Sidebar({ user, onLogout }: SidebarProps) {
    return (
        <aside className="w-64 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden md:flex flex-col">
            <div className="p-6 flex items-center gap-3">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-14 items-center justify-center flex">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.png" alt="Huios Logo" className="w-full h-auto object-contain dark:brightness-200" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-sm font-bold leading-tight uppercase tracking-wider text-primary">Huios Seminário</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Teológico</p>
                    </div>
                </Link>
            </div>

  <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
  <NavLink href="/" icon="grid_view" label="Painel" />

  <NavGroup
  label="Cadastros"
  icon="list_alt"
  links={[
    { href: "/alunos", icon: "group", label: "Alunos" },
    { href: "/professores", icon: "school", label: "Professores" },
    { href: "/equipe", icon: "shield_person", label: "Equipe" },
    { href: "/cursos", icon: "menu_book", label: "Cursos" },
    { href: "/turmas", icon: "diversity_3", label: "Turmas" },
    { href: "/disciplinas", icon: "book", label: "Disciplinas" },
    { href: "/matriculas", icon: "assignment", label: "Matrículas" },
  ]}
  />

  <NavGroup
  label="Acadêmico"
  icon="school"
  links={[
    { href: "/provas", icon: "quiz", label: "Provas" },
    { href: "/aulas", icon: "calendar_today", label: "Aulas" },
    { href: "/boletins", icon: "grade", label: "Boletins" },
  ]}
  />

  <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
  <NavLink href="/configuracoes" icon="settings" label="Configurações" />
  </div>
  </nav>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary">person</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{user?.name || "Usuário"}</p>
                        <p className="text-[10px] text-slate-500">{user ? ROLE_LABELS[user.role] || user.role : ""}</p>
                    </div>
                    <button
                        onClick={onLogout}
                        title="Sair do sistema"
                        className="text-slate-400 hover:text-red-500 transition-colors flex items-center justify-center cursor-pointer"
                    >
                        <span className="material-symbols-outlined">logout</span>
                    </button>
                </div>
            </div>
        </aside>
    );
}
