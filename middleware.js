import { NextResponse } from 'next/server';
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
    '/api/webhooks/stripe',
    '/api/newsletter/unsubscribe',
    '/api/confirmation/status',
    '/unsubscribed',
    '/confirmation',
];



export async function middleware(req) {
    const { pathname } = req.nextUrl;

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

    // Check password cookie (compare against sha256 of SITE_PASSWORD)
    if (pwSession && process.env.SITE_PASSWORD) {
        const pwHash = await sha256Hex(process.env.SITE_PASSWORD);
        if (pwSession === pwHash) return NextResponse.next();
    }

    // Redirect to login
    return NextResponse.redirect(new URL('/login', req.url));
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
