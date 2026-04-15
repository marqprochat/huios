'use server'

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createDiscipline(formData: FormData) {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const workloadStr = formData.get('workload') as string;
    const courseClassIds = formData.getAll('courseClassIds') as string[];
    const teacherId = formData.get('teacherId') as string;
    const yearStr = formData.get('year') as string;

    if (!name || courseClassIds.length === 0) {
        throw new Error('Nome e pelo menos uma Turma são obrigatórios');
    }

    const workload = workloadStr ? parseInt(workloadStr, 10) : null;
    const year = yearStr ? parseInt(yearStr, 10) : null;

    await prisma.discipline.create({
        data: {
            name,
            description: description || null,
            workload: workload || null,
            year,
            courseClasses: {
                connect: courseClassIds.map(id => ({ id }))
            },
            teacherId: teacherId || null,
        }
    });

    revalidatePath('/disciplinas');
    redirect('/disciplinas');
}

export async function updateDiscipline(id: string, formData: FormData) {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const workloadStr = formData.get('workload') as string;
    const courseClassIds = formData.getAll('courseClassIds') as string[];
    const teacherId = formData.get('teacherId') as string;
    const yearStr = formData.get('year') as string;

    if (!name || courseClassIds.length === 0) {
        throw new Error('Nome e pelo menos uma Turma são obrigatórios');
    }

    const workload = workloadStr ? parseInt(workloadStr, 10) : null;
    const year = yearStr ? parseInt(yearStr, 10) : null;

    await prisma.discipline.update({
        where: { id },
        data: {
            name,
            description: description || null,
            workload: workload || null,
            year,
            courseClasses: {
                set: courseClassIds.map(id => ({ id }))
            },
            teacherId: teacherId || null,
        }
    });

    revalidatePath('/disciplinas');
    redirect('/disciplinas');
}

export async function deleteDiscipline(id: string) {
    try {
        await prisma.discipline.delete({
            where: { id }
        });
        
        revalidatePath('/disciplinas');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting discipline:', error);
        
        // Check for Prisma foreign key constraint error (P2003)
        if (error.code === 'P2003') {
            return { 
                success: false, 
                error: 'Não é possível excluir esta disciplina pois existem registros (notas, aulas ou provas) vinculados a ela.' 
            };
        }
        
        return { 
            success: false, 
            error: 'Ocorreu um erro ao tentar excluir a disciplina. Tente novamente mais tarde.' 
        };
    }
}
