'use server'

import prisma from '@/lib/prisma';
import { apiFetch } from '@/lib/api';
import { hashPassword } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createEnrollmentCharge } from '@/app/financeiro/actions';
import { sincronizarPresencas } from '@/lib/enrollment';

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

export async function createAluno(prevState: any, formData: FormData) {
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
        return { success: false, message: 'Nome e email são obrigatórios' };
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
            const enrollments = await prisma.$transaction(
                selectedClassIds.map(classId =>
                    prisma.enrollment.create({
                        data: {
                            studentId: student.id,
                            classId,
                            status: (formData.get(`status_${classId}`) as string) || 'CURSANDO',
                        },
                    })
                )
            );
            for (const enrollment of enrollments) {
                await createEnrollmentCharge(student.id, enrollment.id, enrollment.classId);
                await sincronizarPresencas(student.id, enrollment.classId);
            }
        }
        revalidatePath('/alunos');
        return { success: true, message: 'Aluno criado com sucesso!' };
    } catch (error: any) {
        console.error("ERRO AO CRIAR ALUNO:", error);
        if (error.code === 'P2002') {
            return { success: false, message: 'Este e-mail já está em uso.' };
        }
        return { success: false, message: 'Erro ao criar aluno: ' + error.message };
    }
}

export async function updateAluno(id: string, prevState: any, formData: FormData) {
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
        return { success: false, message: 'Nome e email são obrigatórios' };
    }

    try {
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
                    status: (formData.get(`status_${classId}`) as string) || 'CURSANDO',
                })),
            });
            for (const classId of selectedClassIds) {
                await sincronizarPresencas(id, classId);
            }
        }

        revalidatePath('/alunos');
        return { success: true, message: 'Aluno atualizado com sucesso!' };
    } catch (error: any) {
        console.error("ERRO AO ATUALIZAR ALUNO:", error);
        if (error.code === 'P2002') {
            return { success: false, message: 'Este e-mail já está em uso.' };
        }
        return { success: false, message: 'Erro ao atualizar aluno: ' + error.message };
    }
}

export async function createStudentLogin(studentId: string) {
    try {
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            select: { userId: true, name: true, email: true, cpf: true }
        });

        if (!student) {
            return { success: false, message: 'Aluno não encontrado.' };
        }

        if (student.userId) {
            return { success: false, message: 'Este aluno já possui um login.' };
        }

        const rawPassword = student.cpf ? student.cpf.replace(/\D/g, '') : 'huios123';
        const hashedPw = await hashPassword(rawPassword);

        // Check if a user with this email already exists
        const existingUser = await prisma.user.findUnique({ where: { email: student.email } });

        let userId: string;
        if (existingUser) {
            userId = existingUser.id;
        } else {
            const newUser = await prisma.user.create({
                data: {
                    name: student.name,
                    email: student.email,
                    password: hashedPw,
                    role: 'ALUNO',
                    active: true,
                }
            });
            userId = newUser.id;
        }

        await prisma.student.update({
            where: { id: studentId },
            data: { userId }
        });

        revalidatePath(`/alunos/${studentId}`);
        const defaultPw = student.cpf ? 'CPF (apenas números)' : '"huios123"';
        return { success: true, message: `Login criado! Senha padrão: ${defaultPw}` };
    } catch (error: any) {
        return { success: false, message: 'Erro ao criar login: ' + error.message };
    }
}

export async function changeStudentPassword(studentId: string, newPassword: string) {
    if (!newPassword || newPassword.length < 6) {
        return { success: false, message: 'A senha deve ter pelo menos 6 caracteres.' };
    }

    try {
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            select: { userId: true, email: true }
        });

        if (!student?.userId) {
            return { success: false, message: 'Usuário de acesso não encontrado para este aluno.' };
        }

        const hashedPw = await hashPassword(newPassword);

        await prisma.user.update({
            where: { id: student.userId },
            data: { password: hashedPw }
        });

        return { success: true, message: 'Senha alterada com sucesso!' };
    } catch (error: any) {
        return { success: false, message: 'Erro ao alterar senha: ' + error.message };
    }
}

export async function deleteAluno(id: string) {
    try {
        await prisma.$transaction(async (tx) => {
            // Buscar o aluno (e seu usuário vinculado) + matrículas
            const student = await tx.student.findUnique({
                where: { id },
                select: {
                    userId: true,
                    enrollments: { select: { id: true } },
                },
            });

            if (!student) {
                throw new Error('Aluno não encontrado.');
            }

            const enrollmentIds = student.enrollments.map((e) => e.id);

            // 1) Pagamentos das transações financeiras do aluno (por aluno ou por matrícula)
            await tx.payment.deleteMany({
                where: {
                    transaction: {
                        OR: [
                            { studentId: id },
                            enrollmentIds.length > 0 ? { enrollmentId: { in: enrollmentIds } } : undefined,
                        ].filter(Boolean) as any,
                    },
                },
            });

            // 2) Transações financeiras (liberam as matrículas)
            await tx.financialTransaction.deleteMany({
                where: {
                    OR: [
                        { studentId: id },
                        enrollmentIds.length > 0 ? { enrollmentId: { in: enrollmentIds } } : undefined,
                    ].filter(Boolean) as any,
                },
            });

            // 3) Justificativas de falta (também caem em cascata via Attendance, mas removemos explicitamente)
            await tx.absenceJustification.deleteMany({ where: { studentId: id } });

            // 4) Presenças
            await tx.attendance.deleteMany({ where: { studentId: id } });

            // 5) Notas
            await tx.grade.deleteMany({ where: { studentId: id } });

            // 6) Submissões de provas (respostas caem em cascata)
            await tx.examSubmission.deleteMany({ where: { studentId: id } });

            // 7) Vínculos de equipe (membros) — desvincula o aluno
            await tx.teamMember.deleteMany({ where: { studentId: id } });

            // 8) Matrículas
            await tx.enrollment.deleteMany({ where: { studentId: id } });

            // 9) O aluno
            await tx.student.delete({ where: { id } });

            // 10) Usuário de login vinculado (se houver)
            if (student.userId) {
                await tx.user.delete({ where: { id: student.userId } });
            }
        });
    } catch (error: any) {
        console.error('Erro ao excluir aluno:', error);
        return { success: false, message: 'Erro ao excluir aluno: ' + (error?.message ?? 'erro desconhecido') };
    }

    revalidatePath('/alunos');
    return { success: true, message: 'Aluno excluído com sucesso!' };
}
