import { createAluno } from '../actions';
import Link from 'next/link';

export default function NovoAlunoPage() {
    return (
        <div className="max-w-[800px] mx-auto p-4 lg:p-8 space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/alunos" className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Novo Aluno</h2>
                    <p className="text-slate-500 dark:text-slate-400">Preencha os dados curriculares e pessoais do aluno.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8">
                <form action={createAluno} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-bold text-slate-700 dark:text-slate-300">Nome Completo <span className="text-red-500">*</span></label>
                            <input type="text" id="name" name="name" required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="Ex: João da Silva" />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-bold text-slate-700 dark:text-slate-300">Email <span className="text-red-500">*</span></label>
                            <input type="email" id="email" name="email" required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="joao@exemplo.com" />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="phone" className="text-sm font-bold text-slate-700 dark:text-slate-300">Telefone</label>
                            <input type="tel" id="phone" name="phone" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="(11) 99999-9999" />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="cpf" className="text-sm font-bold text-slate-700 dark:text-slate-300">CPF</label>
                            <input type="text" id="cpf" name="cpf" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="000.000.000-00" />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label htmlFor="address" className="text-sm font-bold text-slate-700 dark:text-slate-300">Endereço Completo</label>
                            <input type="text" id="address" name="address" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="Rua Exemplo, 123 - Centro, São Paulo - SP" />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                        <Link href="/alunos" className="px-6 py-3 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            Cancelar
                        </Link>
                        <button type="submit" className="bg-primary text-white px-8 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">save</span>
                            Salvar Aluno
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
