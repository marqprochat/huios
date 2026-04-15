'use server'

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import fs from 'fs';
import path from 'path';

async function saveFile(file: File | null): Promise<string | null> {
    if (!file || file.size === 0) return null;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const filePath = path.join(uploadsDir, fileName);

    fs.writeFileSync(filePath, buffer);
    return `/uploads/${fileName}`;
}

export async function createCourse(formData: FormData) {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const status = formData.get('status') as string;
    const imageFile = formData.get('imageFile') as File;

    const imageUrl = await saveFile(imageFile);

    if (!name) {
        throw new Error('Nome é obrigatório');
    }

    await prisma.course.create({
        data: {
            name,
            description: description || null,
            imageUrl: imageUrl || null,
            status: status || 'ACTIVE',
        }
    });

    revalidatePath('/cursos');
    redirect('/cursos');
}

export async function updateCourse(id: string, formData: FormData) {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const status = formData.get('status') as string;
    const imageFile = formData.get('imageFile') as File;

    const existingCourse = await prisma.course.findUnique({ where: { id } });
    let imageUrl = existingCourse?.imageUrl || null;

    if (imageFile && imageFile.size > 0) {
        imageUrl = await saveFile(imageFile);
    }

    if (!name) {
        throw new Error('Nome é obrigatório');
    }

    await prisma.course.update({
        where: { id },
        data: {
            name,
            description: description || null,
            imageUrl: imageUrl || null,
            status: status || 'ACTIVE',
        }
    });

    revalidatePath('/cursos');
    redirect('/cursos');
}

export async function deleteCourse(id: string) {
    try {
        await prisma.course.delete({
            where: { id }
        });
        
        revalidatePath('/cursos');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting course:', error);
        
        if (error.code === 'P2003') {
            return { 
                success: false, 
                error: 'Não é possível excluir este curso pois existem turmas vinculadas a ele.' 
            };
        }
        
        return { 
            success: false, 
            error: 'Ocorreu um erro ao tentar excluir o curso.' 
        };
    }
}
