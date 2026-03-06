import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyPassword, signToken, COOKIE_NAME } from '@/lib/auth'

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json()

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email e senha são obrigatórios.' },
                { status: 400 }
            )
        }

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() }
        })

        if (!user || !user.active) {
            return NextResponse.json(
                { error: 'Credenciais inválidas.' },
                { status: 401 }
            )
        }

        const isValid = await verifyPassword(password, user.password)

        if (!isValid) {
            return NextResponse.json(
                { error: 'Credenciais inválidas.' },
                { status: 401 }
            )
        }

        const token = await signToken({
            userId: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        })

        const response = NextResponse.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            }
        })

        response.cookies.set(COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        })

        return response
    } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor.' },
            { status: 500 }
        )
    }
}
