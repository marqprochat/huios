"use client"

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
    { permission: 'boletins.visualizar', href: '/boletins', icon: 'grade', label: 'Boletins' },
    { permission: 'avaliacoes.visualizar', href: '/avaliacoes', icon: 'rate_review', label: 'Avaliações' },
  ])
  const reports = items([
    { permission: 'relatorios.visualizar', href: '/relatorios/presenca', icon: 'how_to_reg', label: 'Presença' },
    { permission: 'relatorios.visualizar', href: '/relatorios/notas', icon: 'grade', label: 'Notas' },
    { permission: 'relatorios.visualizar', href: '/relatorios/provas', icon: 'quiz', label: 'Provas' },
    { permission: 'relatorios.visualizar', href: '/relatorios/alunos', icon: 'group', label: 'Alunos' },
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

  return <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:flex">
    <div className="p-6"><Link href="/" className="flex items-center gap-2"><img src="/logo.png" alt="Huios" className="w-12 dark:brightness-200" /><div><h1 className="text-sm font-bold uppercase tracking-wider text-primary">Huios Seminário</h1><p className="text-xs text-slate-500">Teológico</p></div></Link></div>
    <nav className="flex-1 space-y-1 overflow-y-auto px-4">
      {can('dashboard.visualizar') && <NavLink href="/" icon="grid_view" label="Painel" />}
      {registrations.length > 0 && <NavGroup label="Cadastros" icon="list_alt" links={registrations} />}
      {academic.length > 0 && <NavGroup label="Acadêmico" icon="school" links={academic} />}
      {reports.length > 0 && <NavGroup label="Relatórios" icon="bar_chart" links={reports} />}
      {financial.length > 0 && <NavGroup label="Financeiro" icon="payments" links={financial} />}
      <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
        {can('presenca.visualizar') && <NavLink href="/pendencias" icon="pending_actions" label="Pendências" />}
        {can('configuracoes.visualizar') && <NavLink href="/configuracoes" icon="settings" label="Configurações" />}
        {user?.isSuperAdmin && <NavLink href="/funcoes" icon="admin_panel_settings" label="Funções e permissões" />}
        {user?.isStudent && <NavLink href="/portal" icon="school" label="Portal do aluno" />}
      </div>
    </nav>
    <div className="border-t border-slate-200 p-4 dark:border-slate-800"><div className="flex items-center gap-3 rounded-xl bg-slate-50 p-2 dark:bg-slate-800"><div className="flex size-10 items-center justify-center rounded-full bg-primary/20 text-primary"><span className="material-symbols-outlined">person</span></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{user?.name || 'Usuário'}</p><p className="text-[10px] text-slate-500">{user?.role?.name || ''}</p></div><button onClick={onLogout} title="Sair" className="text-slate-400 hover:text-red-500"><span className="material-symbols-outlined">logout</span></button></div></div>
  </aside>
}
