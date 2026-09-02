import { NextResponse } from 'next/server';
import { signGuestlistJWT } from '@/lib/jwt';
import { getChefPassword } from '@/lib/config';
import { getSupabaseAdmin } from '@/lib/supabase';
import { baseUrl } from '@/lib/event';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateJti() {
    let id = 'GL-';
    for (let i = 0; i < 16; i++) {
        id += CHARS[Math.floor(Math.random() * CHARS.length)];
    }
    return id;
}

export async function POST(req) {
    try {
        const { password, label, count = 1 } = await req.json();

        if (password !== await getChefPassword()) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!label?.trim()) {
            return NextResponse.json({ error: 'Label is required (who is this for?).' }, { status: 400 });
        }

        const usesInt = Math.max(1, Math.min(1000, parseInt(count, 10) || 1));
        const base = baseUrl();

        const jti = generateJti();
        const token = await signGuestlistJWT({ jti, uses: usesInt, label: label.trim() });
        const url = `${base}/guestlist/${token}`;

        const supabase = getSupabaseAdmin();
        const { error } = await supabase.from('guestlists').insert({
            jti,
            label: label.trim(),
            max_tickets: usesInt,
            token,
        });
        if (error) throw error;

        return NextResponse.json({ jti, label: label.trim(), uses: usesInt, url });
    } catch (err) {
        console.error('Guestlist link creation error:', err);
        return NextResponse.json({ error: 'Failed to create guestlist link.' }, { status: 500 });
    }
}
