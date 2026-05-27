import { NextResponse } from 'next/server';
import { createHash } from 'crypto';

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const redirectTo = searchParams.get('redirect') || '/';

    const firstPassword = (process.env.SITE_PASSWORD || '').split(',')[0].trim();
    const pwHash = createHash('sha256')
        .update(firstPassword)
        .digest('hex');

    const response = NextResponse.redirect(new URL(redirectTo, req.url));
    response.cookies.set('pw_session', pwHash, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
    });

    return response;
}
