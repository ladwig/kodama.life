import { NextResponse } from 'next/server';

async function sha256hex(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function middleware(req) {
    const { pathname } = req.nextUrl;

    if (!pathname.startsWith('/secret=')) return;

    const pw = pathname.slice('/secret='.length);
    const validPasswords = (process.env.SITE_PASSWORD || '').split(',').map(p => p.trim()).filter(Boolean);
    const matched = validPasswords.find(p => p === pw);

    if (!matched) {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    const pwHash = await sha256hex(matched);
    const response = NextResponse.redirect(new URL('/', req.url));
    response.cookies.set('pw_session', pwHash, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
    });
    return response;
}

export const config = {
    matcher: ['/secret=(.*)'],
};
