import { NextResponse } from 'next/server';
import { createHash } from 'crypto';

export function middleware(req) {
    const { pathname } = req.nextUrl;

    // Handle /secret=<password> URLs
    if (pathname.startsWith('/secret=')) {
        const pw = pathname.slice('/secret='.length);
        const validPasswords = (process.env.SITE_PASSWORD || '').split(',').map(p => p.trim()).filter(Boolean);
        const matched = validPasswords.find(p => p === pw);

        if (matched) {
            const pwHash = createHash('sha256').update(matched).digest('hex');
            const response = NextResponse.redirect(new URL('/', req.url));
            response.cookies.set('pw_session', pwHash, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 30,
                path: '/',
            });
            return response;
        }

        return NextResponse.redirect(new URL('/login', req.url));
    }
}

export const config = {
    matcher: '/secret=:path*',
};
