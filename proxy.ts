import { NextResponse } from 'next/server';
import { get } from '@vercel/edge-config';
import { verifyJWT } from './lib/jwt';

// Use Web Crypto API — Edge Runtime doesn't support Node's crypto module
async function sha256Hex(str) {
    const buf = await globalThis.crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(str)
    );
    return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

// Routes that are ALWAYS public
const PUBLIC_PATHS = [
    '/login',
    '/api/auth/login',
    '/api/auth/verify',
    '/api/auth/set-cookie',
    '/api/auth/magic',
    '/api/webhooks/stripe',
    '/api/newsletter/unsubscribe',
    '/api/confirmation/status',
    '/unsubscribed',
    // Chef portal — has its own password protection
    '/chef',
    '/api/chef/',
    // Magic ticket links — JWT in the URL is the auth
    '/magic-ticket',
    '/api/checkout/create-magic-intent',
    '/confirmation',
    '/newsletters',
];



export async function proxy(req) {
    const { pathname } = req.nextUrl;

    // Handle /secret=<password>[/<dest>] URLs — set session cookie and redirect.
    // e.g. /secret=22-08-2026 -> /, /secret=22-08-2026/tickets -> /tickets
    if (pathname.startsWith('/secret=')) {
        const rest = pathname.slice('/secret='.length);
        const slashIdx = rest.indexOf('/');
        const pw = slashIdx === -1 ? rest : rest.slice(0, slashIdx);
        // Only allow internal relative paths (guard against open redirects)
        const destPath = slashIdx === -1 ? '/' : rest.slice(slashIdx);
        const dest = destPath.startsWith('/') && !destPath.startsWith('//') ? destPath : '/';
        const validPasswords = (process.env.SITE_PASSWORD || '').split(',').map(p => p.trim()).filter(Boolean);
        const matched = validPasswords.find(p => p === pw);
        if (matched) {
            const pwHash = await sha256Hex(matched);
            const response = NextResponse.redirect(new URL(dest, req.url));
            response.cookies.set('pw_session', pwHash, {
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 30,
                path: '/',
            });
            return response;
        }
        return NextResponse.redirect(new URL('/login', req.url));
    }

    // Allow public routes and static assets
    if (
        PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)$/)
    ) {
        return NextResponse.next();
    }

    const ticketToken = req.cookies.get('ticket_token')?.value;
    const pwSession = req.cookies.get('pw_session')?.value;

    // Check ticket JWT
    if (ticketToken) {
        const payload = await verifyJWT(ticketToken);
        if (payload?.buyer_email) return NextResponse.next();
    }

    // Check password cookie (compare against sha256 of any valid password)
    if (pwSession && process.env.SITE_PASSWORD) {
        const passwords = process.env.SITE_PASSWORD.split(',').map(p => p.trim()).filter(Boolean);
        for (const p of passwords) {
            if (pwSession === await sha256Hex(p)) return NextResponse.next();
        }
    }

    // Check if password protection is disabled via Edge Config
    try {
        const enabled = await get('password_protection_enabled');
        if (enabled === false) return NextResponse.next();
    } catch {
        // Edge Config unavailable — fall through to redirect
    }

    // Redirect to login
    return NextResponse.redirect(new URL('/login', req.url));
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
