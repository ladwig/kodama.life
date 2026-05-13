import { NextResponse } from 'next/server';
import { createHash } from 'crypto';

export async function POST(req) {
    try {
        const { password } = await req.json();

        if (!password) {
            return NextResponse.json({ error: 'Password required' }, { status: 400 });
        }

        const validPasswords = (process.env.SITE_PASSWORD || '').split(',').map(p => p.trim()).filter(Boolean);
        const matched = validPasswords.find(p => p === password);
        if (!matched) {
            return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
        }

        // Store hash of the matched password in cookie
        const pwHash = createHash('sha256')
            .update(matched)
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
