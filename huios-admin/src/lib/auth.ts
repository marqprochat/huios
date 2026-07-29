import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { getJwtSecretBytes } from '@/lib/jwt-secret';
import { resolveCurrentSession } from '@/lib/session-policy';

const COOKIE_NAME = 'huios-session';

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}

export async function verifyPassword(
    password: string,
    hash: string
): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export interface SessionPayload {
    id: string;
    userId: string;
    name: string;
    email: string;
    role: string;
    mustChangePassword: boolean;
}

export async function signToken(payload: SessionPayload): Promise<string> {
    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(getJwtSecretBytes());
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(token, getJwtSecretBytes());
        const userId = typeof payload.id === 'string'
            ? payload.id
            : typeof payload.userId === 'string'
                ? payload.userId
                : null;

        if (!userId || typeof payload.email !== 'string') return null;

        return {
            id: userId,
            userId,
            name: typeof payload.name === 'string' ? payload.name : '',
            email: payload.email,
            role: typeof payload.role === 'string' ? payload.role : '',
            mustChangePassword: payload.mustChangePassword === true,
        };
    } catch {
        return null;
    }
}

export async function getIdentitySession(): Promise<SessionPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
}

export async function getSession(): Promise<SessionPayload | null> {
    const session = await getIdentitySession();

    return resolveCurrentSession(session, (userId) => prisma.user.findUnique({
        where: { id: userId },
        select: {
            active: true,
            mustChangePassword: true,
            student: {
                select: { id: true },
            },
            adminRole: {
                select: {
                    key: true,
                    active: true,
                },
            },
        },
    }));
}

export { COOKIE_NAME };
