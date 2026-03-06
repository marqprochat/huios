'use server'

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createAluno(formData: FormData) {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const cpf = formData.get('cpf') as string;
    const address = formData.get('address') as string;

    if (!name || !email) {
        throw new Error('Name and email are required');
    }

    await prisma.student.create({
        data: {
            name,
            email,
            phone: phone || null,
            cpf: cpf || null,
            address: address || null,
        }
    });

    revalidatePath('/alunos');
    redirect('/alunos');
}
