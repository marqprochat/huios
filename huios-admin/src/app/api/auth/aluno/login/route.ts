import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyPassword, signToken, COOKIE_NAME } from '@/lib/auth'

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email e senha são obrigatórios.' },
                { status: 400 }
            )
        }

        // Find user with ALUNO role
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                student: {
                    include: {
                        enrollments: {
                            where: { status: 'ACTIVE' },
                            include: {
                                class: {
                                    include: { course: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!user || user.role !== 'ALUNO') {
            return NextResponse.json(
                { error: 'Credenciais inválidas.' },
                { status: 401 }
            );
        }

        if (!user.active) {
            return NextResponse.json(
                { error: 'Usuário inativo.' },
                { status: 403 }
            );
        }

        const isPasswordValid = await verifyPassword(password, user.password);

        if (!isPasswordValid) {
            return NextResponse.json(
                { error: 'Credenciais inválidas.' },
                { status: 401 }
            );
        }

        const token = await signToken({
            userId: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        });

        const response = NextResponse.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                studentId: user.student?.id,
            }
        });

        response.cookies.set(COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Student login error:', error);
        return NextResponse.json(
            { error: 'Erro ao fazer login.' },
            { status: 500 }
        );
    }
}
