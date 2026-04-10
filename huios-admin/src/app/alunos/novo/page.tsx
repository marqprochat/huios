import { fetchClasses } from '../actions';
import Link from 'next/link';
import NovoAlunoForm from './NovoAlunoForm';

export default async function NovoAlunoPage() {
    const classes = await fetchClasses();

    return (
        <div className="max-w-[900px] mx-auto p-4 lg:p-8 space-y-6">
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
                <NovoAlunoForm classes={classes} />
            </div>
        </div>
    );
}

