import { NextResponse } from 'next/server';
import { createHash } from 'crypto';

export async function POST(req) {
    try {
        const { password } = await req.json();

        if (!password) {
            return NextResponse.json({ error: 'Password required' }, { status: 400 });
        }

        if (password !== process.env.SITE_PASSWORD) {
            return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
        }

        // Create a hash of the password to store in cookie
        const pwHash = createHash('sha256')
            .update(process.env.SITE_PASSWORD)
            .digest('hex');

        const response = NextResponse.json({ success: true });
        response.cookies.set('pw_session', pwHash, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: '/',
        });

        return response;
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
