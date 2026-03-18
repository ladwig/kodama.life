import { NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    const payload = await verifyJWT(token);
    if (!payload?.buyer_email) {
        return NextResponse.redirect(new URL('/login?error=invalid_token', req.url));
    }

    const response = NextResponse.redirect(new URL('/', req.url));
    response.cookies.set('ticket_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 90, // 90 days
        path: '/',
    });

    return response;
}
