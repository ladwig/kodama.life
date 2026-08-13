import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getChefPassword } from '@/lib/config';

export async function POST(req) {
    try {
        const { password } = await req.json();

        if (password !== await getChefPassword()) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();

        const [{ data: orders }, { data: tickets }, { data: magicLinks }, { data: guestLinks }] = await Promise.all([
            supabase
                .from('orders')
                .select('quantity, total_price, price_per_ticket, source, payment_method, created_at, magic_link_jti')
                .eq('status', 'paid'),
            supabase
                .from('tickets')
                .select('checked_in'),
            supabase.from('magic_links').select('jti, uses, revoked'),
            supabase.from('guestlists').select('jti, max_tickets, revoked'),
        ]);

        if (!orders || !tickets) {
            return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
        }

        // Claimed count per link (magic + guestlist jtis are distinct)
        const claimedByJti = {};
        for (const o of orders) {
            if (o.magic_link_jti) claimedByJti[o.magic_link_jti] = (claimedByJti[o.magic_link_jti] || 0) + o.quantity;
        }
        // Potential guests = unclaimed capacity on active (non-revoked) links
        const openMagic = (magicLinks || [])
            .filter((l) => !l.revoked)
            .reduce((s, l) => s + Math.max(0, (l.uses || 0) - (claimedByJti[l.jti] || 0)), 0);
        const openGuestlist = (guestLinks || [])
            .filter((g) => !g.revoked)
            .reduce((s, g) => s + Math.max(0, (g.max_tickets || 0) - (claimedByJti[g.jti] || 0)), 0);

        // Guestlist tickets are free and tracked separately — exclude from all sales KPIs.
        const salesOrders = orders.filter((o) => o.source !== 'guestlist');
        const guestlistTickets = orders
            .filter((o) => o.source === 'guestlist')
            .reduce((sum, o) => sum + o.quantity, 0);

        // Actual money kept per order: what was really charged (total_price already
        // reflects group deals) minus estimated Stripe fees (1.5% + €0.25 per charge,
        // the same model checkout uses). Non-Stripe orders (offline) have no fee.
        const netOf = (o) => {
            const gross = o.total_price || 0;
            const fee = (o.payment_method || '').startsWith('stripe') ? Math.round(gross * 0.015 + 25) : 0;
            return gross - fee;
        };

        const totalTickets = salesOrders.reduce((sum, o) => sum + o.quantity, 0);
        const grossRevenue = salesOrders.reduce((sum, o) => sum + o.total_price, 0);
        const netRevenue = salesOrders.reduce((sum, o) => sum + netOf(o), 0);

        // Ticket mix (by tickets). Group deals are inferred: charged less than base
        // (4-for-3 discount), whereas normal/magic always add a fee on top.
        const mix = { normal: 0, group: 0, magic: 0, offline: 0 };
        for (const o of salesOrders) {
            const src = o.source || 'online';
            if (src === 'magic_link') mix.magic += o.quantity;
            else if (src === 'offline') mix.offline += o.quantity;
            else if (o.total_price < o.price_per_ticket * o.quantity) mix.group += o.quantity;
            else mix.normal += o.quantity;
        }

        // By source
        const bySource = {};
        for (const o of salesOrders) {
            const src = o.source || 'online';
            if (!bySource[src]) bySource[src] = { orders: 0, tickets: 0, revenue: 0 };
            bySource[src].orders += 1;
            bySource[src].tickets += o.quantity;
            bySource[src].revenue += netOf(o);
        }

        // By payment method
        const byMethod = {};
        for (const o of salesOrders) {
            const m = o.payment_method || 'unknown';
            if (!byMethod[m]) byMethod[m] = { orders: 0, tickets: 0 };
            byMethod[m].orders += 1;
            byMethod[m].tickets += o.quantity;
        }

        // Price distribution (in euros, per ticket)
        const priceDist = {};
        for (const o of salesOrders) {
            const euros = Math.round(o.price_per_ticket / 100);
            priceDist[euros] = (priceDist[euros] || 0) + o.quantity;
        }

        // Check-in stats
        const checkedIn = tickets.filter(t => t.checked_in).length;

        // Sales over time — group by date
        const salesByDate = {};
        for (const o of salesOrders) {
            const date = o.created_at.slice(0, 10);
            if (!salesByDate[date]) salesByDate[date] = { orders: 0, tickets: 0, revenue: 0 };
            salesByDate[date].orders += 1;
            salesByDate[date].tickets += o.quantity;
            salesByDate[date].revenue += netOf(o);
        }

        return NextResponse.json({
            summary: {
                totalOrders: salesOrders.length,
                totalTickets,
                grossRevenue,
                netRevenue,
                avgPricePerTicket: totalTickets > 0 ? Math.round(netRevenue / totalTickets) : 0,
                guestlistTickets,
            },
            potential: { magic: openMagic, guestlist: openGuestlist, total: openMagic + openGuestlist },
            mix,
            checkins: {
                total: tickets.length,
                checkedIn,
                remaining: tickets.length - checkedIn,
            },
            bySource,
            byMethod,
            priceDist,
            salesByDate,
        });
    } catch (err) {
        console.error('Stats fetch error:', err);
        return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
    }
}
