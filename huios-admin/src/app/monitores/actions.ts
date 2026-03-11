'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function fetchMonitores() {
    try {
        const monitores = await prisma.monitor.findMany({
            orderBy: { name: 'asc' },
            include: {
                student: {
                    select: {
                        name: true,
                    }
                }
            }
        });
        return monitores;
    } catch (error) {
        console.error('Erro ao buscar monitores:', error);
        return [];
    }
}

export async function fetchStudentsForMonitores() {
    try {
        const students = await prisma.student.findMany({
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                cpf: true,
                birthDate: true,
                maritalStatus: true,
                address: true,
            }
        });
        return students;
    } catch (error) {
        console.error('Erro ao buscar alunos:', error);
        return [];
    }
}

export async function createMonitor(formData: FormData) {
    try {
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const phone = formData.get('phone') as string | null;
        const cpf = formData.get('cpf') as string | null;
        const area = formData.get('area') as string | null;
        const birthDateStr = formData.get('birthDate') as string | null;
        const maritalStatus = formData.get('maritalStatus') as string | null;
        const address = formData.get('address') as string | null;
        const studentId = formData.get('studentId') as string | null;

        let birthDate: Date | null = null;
        if (birthDateStr) {
            birthDate = new Date(birthDateStr);
        }

        await prisma.monitor.create({
            data: {
                name,
                email,
                phone,
                cpf,
                area,
                birthDate,
                maritalStatus,
                address,
                studentId: studentId || null,
            },
        });

        revalidatePath('/monitores');
    } catch (error) {
        console.error('Erro ao criar monitor:', error);
        throw error;
    }
}

export async function updateMonitor(id: string, formData: FormData) {
    try {
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const phone = formData.get('phone') as string | null;
        const cpf = formData.get('cpf') as string | null;
        const area = formData.get('area') as string | null;
        const birthDateStr = formData.get('birthDate') as string | null;
        const maritalStatus = formData.get('maritalStatus') as string | null;
        const address = formData.get('address') as string | null;
        const studentId = formData.get('studentId') as string | null;

        let birthDate: Date | null = null;
        if (birthDateStr) {
            birthDate = new Date(birthDateStr);
        }

        await prisma.monitor.update({
            where: { id },
            data: {
                name,
                email,
                phone,
                cpf,
                area,
                birthDate,
                maritalStatus,
                address,
                studentId: studentId || null,
            },
        });

        revalidatePath('/monitores');
    } catch (error) {
        console.error('Erro ao atualizar monitor:', error);
        throw error;
    }
}

export async function deleteMonitor(id: string) {
    try {
        await prisma.monitor.delete({
            where: { id },
        });
        revalidatePath('/monitores');
    } catch (error) {
        console.error('Erro ao deletar monitor:', error);
        throw error;
    }
}
