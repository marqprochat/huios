import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'huios-secret-key-change-in-production'
)

const COOKIE_NAME = 'huios-session'

const PUBLIC_PATHS = ['/login', '/api/auth/login']

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Allow public paths
    if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
        return;
    }

    // Allow static files and Next.js internals
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.includes('.')
    ) {
        return;
    }

    const token = request.cookies.get(COOKIE_NAME)?.value

    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
        await jwtVerify(token, JWT_SECRET)
        return NextResponse.next()
    } catch {
        // Invalid or expired token
        const response = NextResponse.redirect(new URL('/login', request.url))
        response.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' })
        return response
    }
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|uploads).*)'],
}
