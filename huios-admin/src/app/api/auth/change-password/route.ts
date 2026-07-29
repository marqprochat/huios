import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
    COOKIE_NAME,
    getIdentitySession,
    hashPassword,
    signToken,
    verifyPassword,
} from '@/lib/auth';

function sessionUserId(session: unknown): string | null {
    if (!session || typeof session !== 'object') return null;

    const payload = session as { id?: unknown; userId?: unknown };
    if (typeof payload.id === 'string') return payload.id;
    if (typeof payload.userId === 'string') return payload.userId;
    return null;
}

export async function POST(request: Request) {
    try {
        const session = await getIdentitySession();
        const userId = sessionUserId(session);

        if (!userId) {
            return NextResponse.json(
                { error: 'Sessão inválida ou expirada.' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const currentPassword = typeof body.currentPassword === 'string'
            ? body.currentPassword
            : '';
        const newPassword = typeof body.newPassword === 'string'
            ? body.newPassword
            : '';
        const confirmPassword = typeof body.confirmPassword === 'string'
            ? body.confirmPassword
            : '';

        if (!currentPassword || !newPassword || !confirmPassword) {
            return NextResponse.json(
                { error: 'Preencha todos os campos.' },
                { status: 400 }
            );
        }

        if (newPassword.length < 8) {
            return NextResponse.json(
                { error: 'A nova senha deve ter pelo menos 8 caracteres.' },
                { status: 400 }
            );
        }

        if (newPassword !== confirmPassword) {
            return NextResponse.json(
                { error: 'A confirmação da nova senha não confere.' },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                password: true,
                role: true,
                active: true,
                student: { select: { id: true } },
                adminRole: {
                    select: {
                        id: true,
                        key: true,
                        active: true,
                    },
                },
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'Sessão inválida ou expirada.' },
                { status: 401 }
            );
        }

        if (!user.active) {
            return NextResponse.json(
                { error: 'Usuário inativo.' },
                { status: 403 }
            );
        }

        const currentPasswordIsValid = await verifyPassword(
            currentPassword,
            user.password
        );

        if (!currentPasswordIsValid) {
            return NextResponse.json(
                { error: 'Senha atual incorreta.' },
                { status: 400 }
            );
        }

        if (newPassword === currentPassword) {
            return NextResponse.json(
                { error: 'A nova senha deve ser diferente da senha atual.' },
                { status: 400 }
            );
        }

        const password = await hashPassword(newPassword);
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password,
                mustChangePassword: false,
            },
        });

        const role = user.adminRole?.active
            ? user.adminRole.key
            : user.role;
        const token = await signToken({
            id: user.id,
            userId: user.id,
            name: user.name,
            email: user.email,
            role,
            mustChangePassword: false,
        });

        const response = NextResponse.json({
            success: true,
            isAdmin: Boolean(user.adminRole?.active),
            isStudent: Boolean(user.student),
        });

        response.cookies.set(COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.COOKIE_SECURE === 'true',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24,
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Change password error:', error);
        return NextResponse.json(
            { error: 'Não foi possível alterar a senha. Tente novamente.' },
            { status: 500 }
        );
    }
}
