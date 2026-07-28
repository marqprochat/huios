import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'huios-secret-key-change-in-production'
);

const COOKIE_NAME = 'huios-session';

const PUBLIC_PATHS = [
    '/login',
    '/portal/login',
    '/api/auth/',
    '/api/portal/',
    '/api/proxy/',
    '/api/matricula/',
    '/api/pagamentos/',
];

function isPublicEnroll(pathname: string): boolean {
    return pathname === '/matricula' || pathname.startsWith('/matricula/');
}

function isStaticPath(pathname: string): boolean {
    return (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.includes('.')
    );
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (isStaticPath(pathname)) {
        return;
    }

    const isPublicPath =
        PUBLIC_PATHS.some((path) => pathname.startsWith(path)) ||
        isPublicEnroll(pathname);
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
        if (isPublicPath) return;

        const loginUrl = pathname.startsWith('/portal')
            ? '/portal/login'
            : '/login';
        return NextResponse.redirect(new URL(loginUrl, request.url));
    }

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const mustChangePassword = payload.mustChangePassword === true;
        const isPasswordChangePath =
            pathname === '/trocar-senha' ||
            pathname.startsWith('/api/auth/');

        if (mustChangePassword && !isPasswordChangePath) {
            return NextResponse.redirect(
                new URL('/trocar-senha', request.url)
            );
        }

        return NextResponse.next();
    } catch {
        if (isPublicPath) {
            const response = NextResponse.next();
            response.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
            return response;
        }

        const loginUrl = pathname.startsWith('/portal')
            ? '/portal/login'
            : '/login';
        const response = NextResponse.redirect(
            new URL(loginUrl, request.url)
        );
        response.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
        return response;
    }
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|uploads).*)'],
};
