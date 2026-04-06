'use server'

import prisma from '@/lib/prisma';
import { apiFetch } from '@/lib/api';
import { hashPassword } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

interface ClassWithRelations {
    id: string;
    name: string;
    startDate?: Date | null;
    endDate?: Date | null;
    duration?: string | null;
    course: {
        id: string;
        name: string;
    };
}

export async function fetchClasses(): Promise<ClassWithRelations[]> {
    try {
        const classes = await prisma.courseClass.findMany({
            include: { course: true },
            orderBy: { name: 'asc' }
        });
        return classes as unknown as ClassWithRelations[];
    } catch (error) {
        console.error('Error fetching classes:', error);
        return [];
    }
}

export async function createAluno(formData: FormData) {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const cpf = formData.get('cpf') as string;
    const address = formData.get('address') as string;

    const birthDate = formData.get('birthDate') as string;
    const maritalStatus = formData.get('maritalStatus') as string;
    const conversionTime = formData.get('conversionTime') as string;
    const churchName = formData.get('churchName') as string;
    const churchMembershipTime = formData.get('churchMembershipTime') as string;
    const isBaptized = formData.get('isBaptized') === 'true';
    const baptismTime = formData.get('baptismTime') as string;
    const howKnewHuios = formData.get('howKnewHuios') as string;
    const enrollmentFee = formData.get('enrollmentFee') as string;
    const didConvivaCourse = formData.get('didConvivaCourse') === 'true';
    const convivaCourseDetails = formData.get('convivaCourseDetails') as string;

    const selectedClassIds = formData.getAll('classIds') as string[];

    if (!name || !email) {
        throw new Error('Nome e email são obrigatórios');
    }

    try {
        const student = await prisma.student.create({
            data: {
                name,
                email,
                phone: phone || null,
                cpf: cpf || null,
                address: address || null,
                birthDate: birthDate ? new Date(birthDate) : null,
                maritalStatus: maritalStatus || null,
                conversionTime: conversionTime || null,
                churchName: churchName || null,
                churchMembershipTime: churchMembershipTime || null,
                isBaptized,
                baptismTime: baptismTime || null,
                howKnewHuios: howKnewHuios || null,
                enrollmentFee: enrollmentFee ? parseFloat(enrollmentFee) : null,
                didConvivaCourse,
                convivaCourseDetails: convivaCourseDetails || null,
            }
        });

        // Create User for student login (password = CPF or 'huios123')
        const rawPassword = cpf ? cpf.replace(/\D/g, '') : 'huios123';
        const hashedPw = await hashPassword(rawPassword);

        try {
            const user = await prisma.user.create({
                data: {
                    name,
                    email,
                    password: hashedPw,
                    role: 'ALUNO',
                    active: true,
                }
            });

            // Link user to student
            await prisma.student.update({
                where: { id: student.id },
                data: { userId: user.id }
            });
        } catch (userError: any) {
            console.warn('Could not create user for student (may already exist):', userError?.message);
        }

        if (selectedClassIds.length > 0) {
            await prisma.enrollment.createMany({
                data: selectedClassIds.map(classId => ({
                    studentId: student.id,
                    classId,
                    status: 'ACTIVE',
                })),
            });
        }
    } catch (error: any) {
        console.error("ERRO GRAVE AO CRIAR ALUNO:", error?.message || error);
        throw error;
    }

    revalidatePath('/alunos');
    redirect('/alunos');
}

export async function updateAluno(id: string, formData: FormData) {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const cpf = formData.get('cpf') as string;
    const address = formData.get('address') as string;

    const birthDate = formData.get('birthDate') as string;
    const maritalStatus = formData.get('maritalStatus') as string;

    const conversionTime = formData.get('conversionTime') as string;
    const churchName = formData.get('churchName') as string;
    const churchMembershipTime = formData.get('churchMembershipTime') as string;
    const isBaptized = formData.get('isBaptized') === 'true';
    const baptismTime = formData.get('baptismTime') as string;

    const howKnewHuios = formData.get('howKnewHuios') as string;
    const enrollmentFee = formData.get('enrollmentFee') as string;
    const didConvivaCourse = formData.get('didConvivaCourse') === 'true';
    const convivaCourseDetails = formData.get('convivaCourseDetails') as string;

    const selectedClassIds = formData.getAll('classIds') as string[];

    if (!name || !email) {
        throw new Error('Nome e email são obrigatórios');
    }

    await prisma.student.update({
        where: { id },
        data: {
            name,
            email,
            phone: phone || null,
            cpf: cpf || null,
            address: address || null,
            birthDate: birthDate ? new Date(birthDate) : null,
            maritalStatus: maritalStatus || null,
            conversionTime: conversionTime || null,
            churchName: churchName || null,
            churchMembershipTime: churchMembershipTime || null,
            isBaptized,
            baptismTime: baptismTime || null,
            howKnewHuios: howKnewHuios || null,
            enrollmentFee: enrollmentFee ? parseFloat(enrollmentFee) : null,
            didConvivaCourse,
            convivaCourseDetails: convivaCourseDetails || null,
        }
    });

    // Update enrollments
    await prisma.enrollment.deleteMany({
        where: { studentId: id }
    });

    if (selectedClassIds.length > 0) {
        await prisma.enrollment.createMany({
            data: selectedClassIds.map(classId => ({
                studentId: id,
                classId,
                status: 'ACTIVE',
            })),
        });
    }

    revalidatePath('/alunos');
    redirect('/alunos');
}

export async function deleteAluno(id: string) {
    // Apagar matrículas do aluno primeiro para não dar erro de foreign key
    await prisma.enrollment.deleteMany({
        where: { studentId: id }
    });

    await prisma.student.delete({
        where: { id }
    });
    
    revalidatePath('/alunos');
}
