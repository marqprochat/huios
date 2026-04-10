import { fetchClasses, updateAluno } from '../../actions';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import EditarAlunoForm from './EditarAlunoForm';

interface EditarAlunoProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function EditarAlunoPage({ params }: EditarAlunoProps) {
    const { id } = await params;
    
    // Fetch student with enrollments
    const aluno = await prisma.student.findUnique({
        where: { id },
        include: {
            enrollments: true
        }
    });

    if (!aluno) {
        notFound();
    }

    const classes = await fetchClasses();
    const enrolledClassIds = aluno.enrollments.map(e => e.classId);

    return (
        <div className="max-w-[900px] mx-auto p-4 lg:p-8 space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/alunos" className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Editar Aluno</h2>
                    <p className="text-slate-500 dark:text-slate-400">Atualize os dados curriculares e pessoais do aluno.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8">
                <EditarAlunoForm aluno={aluno} classes={classes} enrolledClassIds={enrolledClassIds} />
            </div>
        </div>
    );
}
