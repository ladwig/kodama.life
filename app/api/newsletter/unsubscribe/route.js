import { NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { getSupabaseAdmin } from '@/lib/supabase';

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

    const supabase = getSupabaseAdmin();
    await supabase.from('subscribers').delete().eq('email', payload.email);

    return NextResponse.redirect(new URL('/unsubscribed', req.url));
}
