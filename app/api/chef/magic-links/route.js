import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getChefPassword } from '@/lib/config';

// Lists all stored magic links with their claimed count (tickets sold / cap).
// action: 'remove' → revokes a link (kills it) and hides it from the list.
export async function POST(req) {
    try {
        const { password, action, jti } = await req.json();
        if (password !== await getChefPassword()) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://loveatfirstside.quest';

        if (action === 'remove') {
            const { error } = await supabase.from('magic_links').update({ revoked: true }).eq('jti', jti);
            if (error) throw error;
            return NextResponse.json({ ok: true });
        }

        const { data: allLinks } = await supabase
            .from('magic_links')
            .select('jti, label, price, uses, token, created_at, revoked')
            .order('created_at', { ascending: false });

        const links = (allLinks || []).filter((l) => !l.revoked);
        if (links.length === 0) return NextResponse.json({ links: [] });

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
