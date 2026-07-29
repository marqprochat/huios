import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyPassword, signToken, COOKIE_NAME } from '@/lib/auth'

interface StudentSessionUser {
    id: string
    name: string
    email: string
    role: string
    mustChangePassword: boolean
    adminRole: {
        key: string
        active: boolean
    } | null
}

export async function createStudentSession(user: StudentSessionUser) {
    const role = user.adminRole?.active ? user.adminRole.key : user.role
    const token = await signToken({
        id: user.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        role,
        mustChangePassword: user.mustChangePassword,
    })

    return { token, role }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const email = typeof body.email === 'string'
            ? body.email.trim().toLowerCase()
            : ''
        const password = typeof body.password === 'string' ? body.password : ''

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
                adminRole: {
                    select: {
                        key: true,
                        active: true,
                    }
                },
                student: {
                    include: {
                        enrollments: {
                            where: { status: 'CURSANDO' },
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

        if (!user || !user.student) {
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

        const { token, role } = await createStudentSession(user)

        const response = NextResponse.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role,
                mustChangePassword: user.mustChangePassword,
                studentId: user.student?.id,
            }
        });

        response.cookies.set(COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.COOKIE_SECURE === 'true',
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
