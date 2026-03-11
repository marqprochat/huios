import { createCourse } from '../actions';
import Link from 'next/link';

export default function NovoCursoPage() {
    return (
        <div className="max-w-[700px] mx-auto p-4 lg:p-8 space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/cursos" className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Novo Curso</h2>
                    <p className="text-slate-500 dark:text-slate-400">Cadastre um novo curso no sistema.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8">
                <form action={createCourse} className="space-y-6" encType="multipart/form-data">
                    <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-bold text-slate-700 dark:text-slate-300">Nome do Curso <span className="text-red-500">*</span></label>
                        <input type="text" id="name" name="name" required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="Ex: Teologia Básica" />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="description" className="text-sm font-bold text-slate-700 dark:text-slate-300">Descrição</label>
                        <textarea id="description" name="description" rows={4} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white" placeholder="Detalhes do curso..."></textarea>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="imageFile" className="text-sm font-bold text-slate-700 dark:text-slate-300">Imagem do Curso</label>
                        <input type="file" id="imageFile" name="imageFile" accept="image/*" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="status" className="text-sm font-bold text-slate-700 dark:text-slate-300">Status</label>
                        <select id="status" name="status" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white">
                            <option value="ACTIVE">Ativo</option>
                            <option value="INACTIVE">Inativo</option>
                        </select>
                    </div>

                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                        <Link href="/cursos" className="px-6 py-3 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            Cancelar
                        </Link>
                        <button type="submit" className="bg-primary text-white px-8 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">save</span>
                            Salvar Curso
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
