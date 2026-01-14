import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/auth';

export async function middleware(req: NextRequest) {
    const protectedRoutes = ['/'];
    const path = req.nextUrl.pathname;
    const isProtectedRoute = protectedRoutes.includes(path) || path.startsWith('/dashboard'); // protect / and /dashboard

    // 1. Check for session cookie
    const cookie = req.cookies.get('session')?.value;
    const session = cookie ? await decrypt(cookie) : null;

    // 2. Redirect unauthenticated users
    if (isProtectedRoute && !session) {
        return NextResponse.redirect(new URL('/login', req.nextUrl));
    }

    // 3. Redirect authenticated users away from login page
    if (path === '/login' && session) {
        return NextResponse.redirect(new URL('/', req.nextUrl));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
