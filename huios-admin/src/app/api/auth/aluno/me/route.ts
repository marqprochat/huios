import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json(
                { error: 'Não autenticado' },
                { status: 401 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            include: {
                student: {
                    include: {
                        enrollments: {
                            where: { status: 'ACTIVE' },
                            include: {
                                class: {
                                    include: {
                                        course: true,
                                        disciplines: {
                                            include: {
                                                teacher: true
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        grades: {
                            include: {
                                discipline: true,
                                exam: true
                            }
                        },
                        attendances: {
                            include: {
                                lesson: {
                                    include: {
                                        discipline: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!user || !user.student) {
            return NextResponse.json(
                { error: 'Aluno não encontrado' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            student: user.student
        });
    } catch (error) {
        console.error('Get student error:', error);
        return NextResponse.json(
            { error: 'Erro ao carregar dados' },
            { status: 500 }
        );
    }
}
