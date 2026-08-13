import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getChefPassword } from '@/lib/config';

// Lists all guestlist links with their usage (issued / max).
export async function POST(req) {
    try {
        const { password, action, jti, max } = await req.json();
        if (password !== await getChefPassword()) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://loveatfirstside.quest';

        // ── Change a guestlist's cap (must stay >= already issued) ──
        if (action === 'setMax') {
            const newMax = parseInt(max, 10);
            if (!newMax || newMax < 1) return NextResponse.json({ error: 'Invalid amount.' }, { status: 400 });
            const { count: issued } = await supabase
                .from('orders')
                .select('id', { count: 'exact', head: true })
                .eq('magic_link_jti', jti);
            if (newMax < (issued || 0)) {
                return NextResponse.json({ error: `Already issued ${issued}. Can't set below that.` }, { status: 400 });
            }
            const { error } = await supabase.from('guestlists').update({ max_tickets: newMax }).eq('jti', jti);
            if (error) throw error;
            return NextResponse.json({ ok: true });
        }

        // ── Deactivate a guestlist link (revoke + hide) ──
        if (action === 'remove') {
            const { error } = await supabase.from('guestlists').update({ revoked: true }).eq('jti', jti);
            if (error) throw error;
            return NextResponse.json({ ok: true });
        }

        const { data: allLists } = await supabase
            .from('guestlists')
            .select('jti, label, max_tickets, token, created_at, revoked')
            .order('created_at', { ascending: false });

        const lists = (allLists || []).filter((g) => !g.revoked);
        if (lists.length === 0) return NextResponse.json({ guestlists: [] });

        // Count issued tickets per link (one order = one guest ticket)
        const { data: orders } = await supabase
            .from('orders')
            .select('magic_link_jti')
            .eq('source', 'guestlist');

        const usedByJti = {};
        for (const o of orders || []) {
            usedByJti[o.magic_link_jti] = (usedByJti[o.magic_link_jti] || 0) + 1;
        }

        const guestlists = lists.map((g) => ({
            jti: g.jti,
            label: g.label,
            max: g.max_tickets,
            used: usedByJti[g.jti] || 0,
            url: `${baseUrl}/guestlist/${g.token}`,
        }));

        return NextResponse.json({ guestlists });
    } catch (err) {
        console.error('Guestlists list error:', err);
        return NextResponse.json({ error: 'Failed to load guestlists.' }, { status: 500 });
    }
}
