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

        console.log('Fetching student data for userId:', session.userId);

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
                                        course: true
                                    }
                                }
                            }
                        },
                        // Tentando carregar grades e attendances separadamente se necessário, 
                        // ou mantendo-as simples por enquanto para debug
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
                                        disciplines: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!user || !user.student) {
            console.warn('User or student not found for id:', session.userId);
            return NextResponse.json(
                { error: 'Aluno não encontrado' },
                { status: 404 }
            );
        }

        // Remover senhas e dados sensíveis se houver (já estamos selecionando campos específicos no JSON)
        return NextResponse.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            student: user.student
        });
    } catch (error: any) {
        console.error('Get student me error detail:', error);
        return NextResponse.json(
            { 
                error: 'Erro ao carregar dados',
                message: error.message,
                code: error.code
            },
            { status: 500 }
        );
    }
}
