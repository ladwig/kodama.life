import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        const { token } = await req.json();
        if (!token) return NextResponse.json({ success: false });

        const response = NextResponse.json({ success: true });
        response.cookies.set('ticket_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 90, // 90 days
            path: '/',
        });

        return response;
    } catch (err) {
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
