import { NextResponse } from 'next/server';
import { createHash } from 'crypto';

export async function GET(req) {
    const pwHash = createHash('sha256')
        .update(process.env.SITE_PASSWORD)
        .digest('hex');

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
