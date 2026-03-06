import { ThemeToggle } from "./ThemeToggle";

export function Header() {
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
                <button className="relative p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center">
                    <span className="material-symbols-outlined">notifications</span>
                    <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-white dark:border-slate-900"></span>
                </button>
                <button className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg hidden sm:flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined">help_outline</span>
                </button>

                <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2 hidden sm:block"></div>

                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Coordenação</p>
                        <p className="text-[10px] text-slate-500">Online</p>
                    </div>
                    <div className="w-10 h-10 rounded-full border-2 border-primary/20 overflow-hidden bg-primary/10 flex items-center justify-center text-primary font-bold">
                        A
                    </div>
                </div>
            </div>
        </header>
    );
}
