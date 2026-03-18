import { NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    const payload = await verifyJWT(token);
    if (!payload?.email || payload?.type !== 'unsubscribe') {
        return NextResponse.redirect(new URL('/login?error=invalid_token', req.url));
    }

    // Statt DB-Delete: unsubscribed: true in Resend setzen
    // Contact + Segment-Zugehörigkeit bleiben erhalten (Audit Trail)
    await resend.contacts.update({
        email: payload.email,
        unsubscribed: true,
    });

    return NextResponse.redirect(new URL('/unsubscribed', req.url));
}
