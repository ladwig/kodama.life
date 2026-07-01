import { NextResponse } from 'next/server';
import { signMagicLinkJWT } from '@/lib/jwt';
import { Resend } from 'resend';
import { getChefPassword } from '@/lib/config';

const resend = (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.endsWith('_...'))
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateJti() {
    let id = 'ML-';
    for (let i = 0; i < 16; i++) {
        id += CHARS[Math.floor(Math.random() * CHARS.length)];
    }
    return id;
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { password, price, count = 1, email, send_email = false } = body;

        if (password !== await getChefPassword()) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const priceInt = parseInt(price, 10);
        if (!priceInt || priceInt < 1) {
            return NextResponse.json({ error: 'Price must be a positive number.' }, { status: 400 });
        }

        const countInt = Math.max(1, Math.min(100, parseInt(count, 10) || 1));
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sidequest.life';
        const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

        const links = [];
        for (let i = 0; i < countInt; i++) {
            const jti = generateJti();
            const token = await signMagicLinkJWT({ jti, price: priceInt });
            links.push({
                jti,
                url: `${baseUrl}/magic-ticket/${token}`,
                expires_at: expiresAt.toISOString(),
            });
        }

        if (send_email && email && resend) {
            const expiryStr = expiresAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
            const linkItems = links
                .map((l, i) => `<p style="margin:8px 0;"><a href="${l.url}" style="color:#000;font-weight:700;">${countInt > 1 ? `Link ${i + 1}` : 'Claim your ticket'} →</a></p>`)
                .join('');

            await resend.emails.send({
                from: `sidequest <${process.env.RESEND_FROM_ADDRESS}>`,
                to: email,
                subject: countInt === 1 ? `Your ticket link — min. €${priceInt}` : `${countInt} ticket links — min. €${priceInt} each`,
                html: `
                    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem;">
                        <p>Here ${countInt === 1 ? 'is your ticket link' : `are ${countInt} ticket links`} for <strong>sidequest</strong>.</p>
                        <p>Minimum price: <strong>€${priceInt}</strong> per ticket — ${countInt === 1 ? 'this link expires' : 'each link expires'} on <strong>${expiryStr}</strong> and can only be used once.</p>
                        <div style="margin:1.5rem 0;">${linkItems}</div>
                        ${countInt > 1 ? '<p style="font-size:12px;color:#888;">Each link works for one person only. Share individual links — do not forward this email.</p>' : ''}
                    </div>
                `,
            });
        }

        return NextResponse.json({ links });
    } catch (err) {
        console.error('Magic link creation error:', err);
        return NextResponse.json({ error: 'Failed to create magic links.' }, { status: 500 });
    }
}
