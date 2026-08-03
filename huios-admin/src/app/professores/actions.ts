'use server'

import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

type TeacherCreateArgs = { data: Record<string, unknown> };
type TeacherUpdateArgs = { where: { id: string }; data: Record<string, unknown> };
type TeacherDeleteArgs = { where: { id: string } };

export interface ProfessorActionDependencies {
    requirePermission: (key: 'professores.criar' | 'professores.editar' | 'professores.excluir') => Promise<unknown>;
    createTeacher: (args: TeacherCreateArgs) => Promise<unknown>;
    updateTeacher: (args: TeacherUpdateArgs) => Promise<unknown>;
    deleteTeacher: (args: TeacherDeleteArgs) => Promise<unknown>;
    revalidatePath: (path: string) => void;
    redirect: (path: string) => never;
}

const defaultDependencies: ProfessorActionDependencies = {
    requirePermission,
    createTeacher: (args) => prisma.teacher.create(args as never),
    updateTeacher: (args) => prisma.teacher.update(args as never),
    deleteTeacher: (args) => prisma.teacher.delete(args as never),
    revalidatePath,
    redirect,
};

export async function createProfessorWithDependencies(
    formData: FormData,
    dependencies: ProfessorActionDependencies = defaultDependencies,
) {
    await dependencies.requirePermission('professores.criar');
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const cpf = formData.get('cpf') as string;
    const city = formData.get('city') as string;
    const pixType = formData.get('pixType') as string;
    const pix = formData.get('pix') as string;


    if (!name || !email) {
        throw new Error('Name and email are required');
    }

    await dependencies.createTeacher({
        data: {
            name,
            email,
            phone: phone || null,
            cpf: cpf || null,
            city: city || null,
            pixType: pixType || null,
            pix: pix || null,
        }
    });

    dependencies.revalidatePath('/professores');
    dependencies.redirect('/professores');
}

export async function createProfessor(formData: FormData) {
    'use server';
    return createProfessorWithDependencies(formData);
}

export async function updateProfessorWithDependencies(
    id: string,
    formData: FormData,
    dependencies: ProfessorActionDependencies = defaultDependencies,
) {
    await dependencies.requirePermission('professores.editar');
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const cpf = formData.get('cpf') as string;
    const city = formData.get('city') as string;
    const pixType = formData.get('pixType') as string;
    const pix = formData.get('pix') as string;

    if (!name || !email) {
        throw new Error('Name and email are required');
    }

    await dependencies.updateTeacher({
        where: { id },
        data: {
            name,
            email,
            phone: phone || null,
            cpf: cpf || null,
            city: city || null,
            pixType: pixType || null,
            pix: pix || null,
        }
    });

    dependencies.revalidatePath('/professores');
    dependencies.redirect('/professores');
}

export async function updateProfessor(id: string, formData: FormData) {
    'use server';
    return updateProfessorWithDependencies(id, formData);
}

export async function deleteProfessorWithDependencies(
    id: string,
    dependencies: ProfessorActionDependencies = defaultDependencies,
) {
    await dependencies.requirePermission('professores.excluir');
    try {
        await dependencies.deleteTeacher({
            where: { id }
        });
        
        dependencies.revalidatePath('/professores');
        return { success: true };
    } catch (error: unknown) {
        console.error('Error deleting teacher:', error);

        const errorCode = (
            typeof error === 'object' && error !== null && 'code' in error
                ? (error as { code?: unknown }).code
                : undefined
        );

        if (errorCode === 'P2003') {
            return { 
                success: false, 
                error: 'Não é possível excluir este professor pois existem turmas ou disciplinas vinculadas a ele.' 
            };
        }
        
        return { 
            success: false, 
            error: 'Ocorreu um erro ao tentar excluir o professor.' 
        };
    }
}

export async function deleteProfessor(id: string) {
    'use server';
    return deleteProfessorWithDependencies(id);
}
