import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'huios-secret-key-change-in-production'
)

const COOKIE_NAME = 'huios-session'

const PUBLIC_PATHS = ['/login', '/portal/login', '/api/auth/', '/api/portal/']

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
        // Redirect to appropriate login
        if (pathname.startsWith('/portal')) {
            return NextResponse.redirect(new URL('/portal/login', request.url))
        }
        return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET)
        const role = (payload as any).role as string

        // ALUNO trying to access admin area → redirect to portal
        if (role === 'ALUNO' && !pathname.startsWith('/portal') && !pathname.startsWith('/api')) {
            return NextResponse.redirect(new URL('/portal', request.url))
        }

        // Non-ALUNO trying to access portal → redirect to admin
        if (role !== 'ALUNO' && pathname.startsWith('/portal') && !pathname.startsWith('/api')) {
            return NextResponse.redirect(new URL('/', request.url))
        }

        return NextResponse.next()
    } catch {
        // Invalid or expired token
        const loginUrl = pathname.startsWith('/portal') ? '/portal/login' : '/login'
        const response = NextResponse.redirect(new URL(loginUrl, request.url))
        response.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' })
        return response
    }
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|uploads).*)'],
}
