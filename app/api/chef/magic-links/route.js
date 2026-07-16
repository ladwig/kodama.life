import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getChefPassword } from '@/lib/config';
import { signMagicLinkJWT } from '@/lib/jwt';

// Lists all stored magic links with their claimed count (tickets sold / cap).
// action: 'import' takes an old link URL, re-signs a fresh 120-day token
// (same jti/price/uses, so claimed count carries over) and stores it.
export async function POST(req) {
    try {
        const { password, action, url, label } = await req.json();
        if (password !== await getChefPassword()) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://loveatfirstside.quest';

        if (action === 'import') {
            const token0 = String(url || '').split('/magic-ticket/')[1]?.split(/[?#]/)[0]?.trim();
            if (!token0) return NextResponse.json({ error: 'Could not find a token in that URL.' }, { status: 400 });
            let payload;
            try {
                payload = JSON.parse(Buffer.from(token0.split('.')[1], 'base64url').toString());
            } catch {
                return NextResponse.json({ error: 'Could not read that link.' }, { status: 400 });
            }
            if (payload.type !== 'magic_ticket') {
                return NextResponse.json({ error: 'Not a magic ticket link.' }, { status: 400 });
            }
            // Re-sign fresh (signMagicLinkJWT is 120d), same jti/price/uses
            const newToken = await signMagicLinkJWT({ jti: payload.jti, price: payload.price, uses: payload.uses });
            const { error } = await supabase.from('magic_links').upsert({
                jti: payload.jti,
                label: label?.trim() || null,
                price: payload.price,
                uses: payload.uses,
                token: newToken,
            }, { onConflict: 'jti' });
            if (error) throw error;
            return NextResponse.json({ ok: true, url: `${baseUrl}/magic-ticket/${newToken}` });
        }

        const { data: links } = await supabase
            .from('magic_links')
            .select('jti, label, price, uses, token, created_at')
            .order('created_at', { ascending: false });

        if (!links || links.length === 0) return NextResponse.json({ links: [] });

        // Claimed = sum of ticket quantities across orders for each link
        const { data: orders } = await supabase
            .from('orders')
            .select('magic_link_jti, quantity');

        const claimedByJti = {};
        for (const o of orders || []) {
            if (!o.magic_link_jti) continue;
            claimedByJti[o.magic_link_jti] = (claimedByJti[o.magic_link_jti] || 0) + (o.quantity || 0);
        }

        const result = links.map((l) => ({
            jti: l.jti,
            label: l.label,
            price: l.price,
            uses: l.uses,
            claimed: claimedByJti[l.jti] || 0,
            url: `${baseUrl}/magic-ticket/${l.token}`,
        }));

        return NextResponse.json({ links: result });
    } catch (err) {
        console.error('Magic links list error:', err);
        return NextResponse.json({ error: 'Failed to load magic links.' }, { status: 500 });
    }
}
