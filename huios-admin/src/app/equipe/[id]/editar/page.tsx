import Link from 'next/link';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { requirePageAccess } from '@/lib/permissions/page-guard';
import EditarMembroForm from './EditarMembroForm';

interface EditarMembroProps {
    params: Promise<{ id: string }>;
}

export default async function EditarMembroPage({ params }: EditarMembroProps) {
    const { id } = await params;
    await requirePageAccess('equipe.editar');
    
    // Fetch member
    const [member, roles, courseClasses] = await Promise.all([
        prisma.teamMember.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, active: true, adminRoleId: true } },
                courseClassAssignments: { where: { active: true }, select: { courseClassId: true } }
            }
        }),
        prisma.role.findMany({
            where: { active: true },
            orderBy: { name: 'asc' },
            select: { id: true, name: true, protected: true }
        }),
        prisma.courseClass.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, name: true, course: { select: { name: true } } }
        }),
    ]);

    if (!member) {
        notFound();
    }

    return (
        <div className="max-w-[900px] mx-auto p-4 lg:p-8 space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/equipe"
                    className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Editar Membro</h2>
                    <p className="text-slate-500 dark:text-slate-400">Atualize os dados do membro da equipe.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8">
                <EditarMembroForm
                    member={member}
                    roles={roles}
                    courseClasses={courseClasses}
                />
            </div>
        </div>
    );
}
