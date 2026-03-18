import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { signUnsubscribeJWT } from '@/lib/jwt';

export async function POST(req) {
    try {
        const { email, name } = await req.json();

        if (!email || !name) {
            return NextResponse.json({ error: 'E-Mail und Name sind Pflichtfelder.' }, { status: 400 });
        }
        if (!email.includes('@')) {
            return NextResponse.json({ error: 'Ungültige E-Mail-Adresse.' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // Upsert subscriber (update name if email exists)
        const { error } = await supabase.from('subscribers').upsert(
            { email: email.toLowerCase().trim(), name: name.trim() },
            { onConflict: 'email' }
        );

        if (error) throw error;

        // Generate unsubscribe token
        const unsubToken = await signUnsubscribeJWT(email.toLowerCase().trim());
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://kodama.life';
        const unsubLink = `${baseUrl}/api/newsletter/unsubscribe?token=${unsubToken}`;

        return NextResponse.json({ success: true, unsubscribe_link: unsubLink });
    } catch (err) {
        console.error('Newsletter subscribe error:', err);
        return NextResponse.json({ error: 'Fehler beim Anmelden.' }, { status: 500 });
    }
}
