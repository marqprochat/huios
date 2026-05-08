'use server'

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getStudentData(studentId: string) {
    try {
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            include: {
                enrollments: {
                    include: {
                        class: {
                            include: {
                                course: true
                            }
                        }
                    }
                },
                attendances: {
                    include: {
                        lesson: true
                    }
                },
                grades: {
                    include: {
                        discipline: true
                    }
                }
            }
        });
        return student;
    } catch (error) {
        console.error('Error fetching student data:', error);
        return null;
    }
}

export async function updateEnrollmentStatus(
    enrollmentId: string, 
    status: string, 
    statusDate: string, 
    statusReason: string,
    studentId: string
) {
    try {
        await prisma.enrollment.update({
            where: { id: enrollmentId },
            data: {
                status,
                statusDate: statusDate ? new Date(statusDate) : new Date(),
                statusReason: statusReason || null,
            }
        });

        revalidatePath(`/alunos/${studentId}`);
        revalidatePath('/alunos');
        
        return { success: true, message: 'Status atualizado com sucesso!' };
    } catch (error: any) {
        console.error('Error updating enrollment status:', error);
        return { success: false, message: 'Erro ao atualizar status: ' + error.message };
    }
}
