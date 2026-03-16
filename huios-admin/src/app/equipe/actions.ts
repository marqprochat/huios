'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function fetchTeamMembers() {
    try {
        const teamMembers = await prisma.teamMember.findMany({
            orderBy: { name: 'asc' },
            include: {
                student: {
                    select: {
                        name: true,
                    }
                }
            }
        });
        return teamMembers;
    } catch (error) {
        console.error('Erro ao buscar membros da equipe:', error);
        return [];
    }
}

export async function fetchStudentsForTeam() {
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

export async function createTeamMember(formData: FormData) {
    try {
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const phone = formData.get('phone') as string | null;
        const cpf = formData.get('cpf') as string | null;
        const area = formData.get('area') as string | null;
        const role = formData.get('role') as string;
        const birthDateStr = formData.get('birthDate') as string | null;
        const maritalStatus = formData.get('maritalStatus') as string | null;
        const address = formData.get('address') as string | null;
        const studentId = formData.get('studentId') as string | null;

        let birthDate: Date | null = null;
        if (birthDateStr) {
            birthDate = new Date(birthDateStr);
        }

        await prisma.teamMember.create({
            data: {
                name,
                email,
                phone,
                cpf,
                area,
                role,
                birthDate,
                maritalStatus,
                address,
                studentId: studentId || null,
            },
        });

        revalidatePath('/equipe');
    } catch (error) {
        console.error('Erro ao criar membro da equipe:', error);
        throw error;
    }
}

export async function updateTeamMember(id: string, formData: FormData) {
    try {
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const phone = formData.get('phone') as string | null;
        const cpf = formData.get('cpf') as string | null;
        const area = formData.get('area') as string | null;
        const role = formData.get('role') as string;
        const birthDateStr = formData.get('birthDate') as string | null;
        const maritalStatus = formData.get('maritalStatus') as string | null;
        const address = formData.get('address') as string | null;
        const studentId = formData.get('studentId') as string | null;

        let birthDate: Date | null = null;
        if (birthDateStr) {
            birthDate = new Date(birthDateStr);
        }

        await prisma.teamMember.update({
            where: { id },
            data: {
                name,
                email,
                phone,
                cpf,
                area,
                role,
                birthDate,
                maritalStatus,
                address,
                studentId: studentId || null,
            },
        });

        revalidatePath('/equipe');
    } catch (error) {
        console.error('Erro ao atualizar membro da equipe:', error);
        throw error;
    }
}

export async function deleteTeamMember(id: string) {
    try {
        await prisma.teamMember.delete({
            where: { id },
        });
        revalidatePath('/equipe');
    } catch (error) {
        console.error('Erro ao deletar membro da equipe:', error);
        throw error;
    }
}
