'use server'

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createCourseClass(formData: FormData) {
    const name = formData.get('name') as string;
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const duration = formData.get('duration') as string;
    const courseId = formData.get('courseId') as string;

    if (!name || !courseId) {
        throw new Error('Nome e Curso são obrigatórios');
    }

    await prisma.courseClass.create({
        data: {
            name,
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            duration: duration || null,
            courseId,
        }
    });

    revalidatePath('/turmas');
    redirect('/turmas');
}

export async function updateCourseClass(id: string, formData: FormData) {
    const name = formData.get('name') as string;
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const duration = formData.get('duration') as string;
    const courseId = formData.get('courseId') as string;

    if (!name || !courseId) {
        throw new Error('Nome e Curso são obrigatórios');
    }

    await prisma.courseClass.update({
        where: { id },
        data: {
            name,
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            duration: duration || null,
            courseId,
        }
    });

    revalidatePath('/turmas');
    redirect('/turmas');
}

export async function deleteCourseClass(id: string) {
    try {
        await prisma.courseClass.delete({
            where: { id }
        });
        
        revalidatePath('/turmas');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting course class:', error);
        
        if (error.code === 'P2003') {
            return { 
                success: false, 
                error: 'Não é possível excluir esta turma pois existem disciplinas ou matrículas vinculadas a ela.' 
            };
        }
        
        return { 
            success: false, 
            error: 'Ocorreu um erro ao tentar excluir a turma.' 
        };
    }
}
