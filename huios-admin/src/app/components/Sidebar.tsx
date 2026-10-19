"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import NavLink from "./NavLink"
import NavGroup from "./NavGroup"

type NavItem = { permission: string; href: string; icon: string; label: string }

interface UserData {
  userId: string
  name: string
  email: string
  role: { id: string; key: string; name: string } | null
  permissions: string[]
  isStudent: boolean
  isSuperAdmin: boolean
}

export function Sidebar({ user, onLogout }: { user: UserData | null; onLogout: () => void }) {
  const [isHovered, setIsHovered] = useState(false)
  const [isPinned, setIsPinned] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('huios_sidebar_pinned')
      if (saved === 'true') {
        setIsPinned(true)
      }
    } catch {}
  }, [])

  const togglePinned = () => {
    setIsPinned((prev) => {
      const next = !prev
      try {
        localStorage.setItem('huios_sidebar_pinned', String(next))
      } catch {}
      return next
    })
  }

  const isExpanded = isHovered || isPinned

  const can = (permission: string) => Boolean(user?.isSuperAdmin || user?.permissions?.includes(permission))
  const items = (values: NavItem[]) => values.filter(({ permission }) => can(permission)).map(({ permission: _permission, ...item }) => item)
  const registrations = items([
    { permission: 'alunos.visualizar', href: '/alunos', icon: 'group', label: 'Alunos' },
    { permission: 'professores.visualizar', href: '/professores', icon: 'school', label: 'Professores' },
    { permission: 'equipe.visualizar', href: '/equipe', icon: 'shield_person', label: 'Equipe' },
    { permission: 'cursos.visualizar', href: '/cursos', icon: 'menu_book', label: 'Cursos' },
    { permission: 'turmas.visualizar', href: '/turmas', icon: 'diversity_3', label: 'Turmas' },
    { permission: 'disciplinas.visualizar', href: '/disciplinas', icon: 'book', label: 'Disciplinas' },
    { permission: 'matriculas.visualizar', href: '/matriculas', icon: 'assignment', label: 'Matrículas' },
    { permission: 'igrejas.visualizar', href: '/igrejas', icon: 'church', label: 'Igrejas' },
  ])
  const academic = items([
    { permission: 'provas.visualizar', href: '/provas', icon: 'quiz', label: 'Provas' },
    { permission: 'aulas.visualizar', href: '/aulas', icon: 'calendar_today', label: 'Aulas' },
    { permission: 'eventos.visualizar', href: '/eventos', icon: 'confirmation_number', label: 'Eventos' },
    { permission: 'boletins.visualizar', href: '/boletins', icon: 'grade', label: 'Boletins' },
    { permission: 'avaliacoes.visualizar', href: '/avaliacoes', icon: 'rate_review', label: 'Avaliações' },
  ])
  const reports = items([
    { permission: 'relatorios.visualizar', href: '/relatorios/presenca', icon: 'how_to_reg', label: 'Presença' },
    { permission: 'relatorios.visualizar', href: '/relatorios/notas', icon: 'grade', label: 'Notas' },
    { permission: 'relatorios.visualizar', href: '/relatorios/provas', icon: 'quiz', label: 'Provas' },
    { permission: 'relatorios.visualizar', href: '/relatorios/alunos', icon: 'group', label: 'Alunos' },
    { permission: 'relatorios.visualizar', href: '/relatorios/avaliacoes', icon: 'rate_review', label: 'Avaliação do Professor' },
    { permission: 'relatorios.visualizar', href: '/relatorios/eventos', icon: 'event_available', label: 'Eventos' },
  ])
  const financial = items([
    { permission: 'financeiro.visualizar', href: '/financeiro', icon: 'dashboard', label: 'Visão Geral' },
    { permission: 'financeiro.visualizar', href: '/financeiro/contas-a-receber', icon: 'arrow_downward', label: 'Contas a Receber' },
    { permission: 'financeiro.visualizar', href: '/financeiro/contas-a-pagar', icon: 'arrow_upward', label: 'Contas a Pagar' },
    { permission: 'financeiro.visualizar', href: '/financeiro/precos-cursos', icon: 'sell', label: 'Preços dos Cursos' },
    { permission: 'financeiro.visualizar', href: '/cupons', icon: 'confirmation_number', label: 'Cupons' },
    { permission: 'financeiro.visualizar', href: '/financeiro/categorias', icon: 'label', label: 'Categorias' },
    { permission: 'financeiro.visualizar', href: '/financeiro/relatorios', icon: 'bar_chart', label: 'Relatórios' },
  ])

  return (
    <>
      {/* Espaço reservado para o menu recolhido não causar pulo no conteúdo da página */}
      <div 
        className={`hidden md:block flex-shrink-0 transition-all duration-300 ease-in-out ${
          isPinned ? 'w-64' : 'w-[72px]'
        }`}
        aria-hidden="true"
      />

      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`hidden md:flex fixed top-0 bottom-0 left-0 z-40 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 transition-all duration-300 ease-in-out overflow-x-hidden ${
          isExpanded 
            ? 'w-64 shadow-2xl shadow-slate-900/15 dark:shadow-black/60' 
            : 'w-[72px] shadow-none'
        }`}
      >
        <div className="h-16 flex items-center px-3.5 border-b border-transparent flex-shrink-0">
          <Link href="/" className="flex items-center gap-3 overflow-hidden" title="Huios Seminário Teológico">
            <img src="/logo.png" alt="Huios" className="w-9 h-9 object-contain flex-shrink-0 dark:brightness-200" />
            <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'opacity-100 max-w-[150px]' : 'opacity-0 max-w-0'}`}>
              <h1 className="text-xs font-bold uppercase tracking-wider text-primary whitespace-nowrap">Huios Seminário</h1>
              <p className="text-[10px] text-slate-500 whitespace-nowrap">Teológico</p>
            </div>
          </Link>
          {isExpanded && (
            <button
              onClick={togglePinned}
              title={isPinned ? "Desafixar menu (recolher automático)" : "Fixar menu aberto"}
              className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${isPinned ? 'rotate-45 text-primary' : ''}`}>
                push_pin
              </span>
            </button>
          )}
        </div>

        <nav className={`flex-1 space-y-1 overflow-y-auto overflow-x-hidden ${isExpanded ? 'px-3' : 'px-2'} py-2`}>
          {can('dashboard.visualizar') && <NavLink href="/" icon="grid_view" label="Painel" isExpanded={isExpanded} />}
          {registrations.length > 0 && <NavGroup label="Cadastros" icon="list_alt" links={registrations} isExpanded={isExpanded} />}
          {academic.length > 0 && <NavGroup label="Acadêmico" icon="school" links={academic} isExpanded={isExpanded} />}
          {reports.length > 0 && <NavGroup label="Relatórios" icon="bar_chart" links={reports} isExpanded={isExpanded} />}
          {financial.length > 0 && <NavGroup label="Financeiro" icon="payments" links={financial} isExpanded={isExpanded} />}
          <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
            {can('presenca.visualizar') && <NavLink href="/pendencias" icon="pending_actions" label="Pendências" isExpanded={isExpanded} />}
            {can('configuracoes.visualizar') && <NavLink href="/configuracoes" icon="settings" label="Configurações" isExpanded={isExpanded} />}
            {user?.isSuperAdmin && <NavLink href="/funcoes" icon="admin_panel_settings" label="Funções e permissões" isExpanded={isExpanded} />}
            {user?.isStudent && <NavLink href="/portal" icon="school" label="Portal do aluno" isExpanded={isExpanded} />}
          </div>
        </nav>

        <div className="border-t border-slate-200 p-2.5 dark:border-slate-800 flex-shrink-0">
          <div className={`flex items-center ${isExpanded ? 'gap-3 p-2' : 'justify-center p-1'} rounded-xl bg-slate-50 dark:bg-slate-800/80 transition-all duration-200`}>
            <div 
              className="flex size-9 items-center justify-center rounded-full bg-primary/20 text-primary flex-shrink-0"
              title={!isExpanded ? (user?.name || 'Usuário') : undefined}
            >
              <span className="material-symbols-outlined text-[20px]">person</span>
            </div>
            {isExpanded && (
              <>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">{user?.name || 'Usuário'}</p>
                  <p className="truncate text-[10px] text-slate-500">{user?.role?.name || ''}</p>
                </div>
                <button 
                  onClick={onLogout} 
                  title="Sair" 
                  className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors flex-shrink-0 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
