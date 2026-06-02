import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyPassword, signToken, COOKIE_NAME } from '@/lib/auth'
import { getApiUrl } from '@/lib/api'

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

        // Call the backend API
        const apiUrl = getApiUrl();
        const fullUrl = `${apiUrl}/api/auth/login`;
        
        try {
            const apiResponse = await fetch(fullUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await apiResponse.json();

            if (!apiResponse.ok) {
                return NextResponse.json(
                    { error: data.message || 'Credenciais inválidas.' },
                    { status: apiResponse.status }
                );
            }

            const { token, user } = data;

            const response = NextResponse.json({
                success: true,
                user
            });

            response.cookies.set(COOKIE_NAME, token, {
                httpOnly: true,
                secure: process.env.COOKIE_SECURE === 'true',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7, // 7 days
                path: '/',
            });

            return response;
        } catch (fetchError: any) {
            console.error('Fetch error calling backend:', fetchError);
            return NextResponse.json(
                { error: `Erro ao conectar na API interna: ${fetchError.message}` },
                { status: 502 }
            );
        }
    } catch (error: any) {
        console.error('Login proxy internal error:', error);
        return NextResponse.json(
            { error: 'Erro interno no servidor de login.' },
            { status: 500 }
        );
    }
}
