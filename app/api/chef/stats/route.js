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

        const [{ data: orders }, { data: tickets }] = await Promise.all([
            supabase
                .from('orders')
                .select('quantity, total_price, price_per_ticket, source, payment_method, created_at')
                .eq('status', 'paid'),
            supabase
                .from('tickets')
                .select('checked_in'),
        ]);

        if (!orders || !tickets) {
            return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
        }

        const totalTickets = orders.reduce((sum, o) => sum + o.quantity, 0);
        const grossRevenue = orders.reduce((sum, o) => sum + o.total_price, 0);
        const netRevenue = orders.reduce((sum, o) => sum + (o.price_per_ticket * o.quantity), 0);

        // By source
        const bySource = {};
        for (const o of orders) {
            const src = o.source || 'online';
            if (!bySource[src]) bySource[src] = { orders: 0, tickets: 0, revenue: 0 };
            bySource[src].orders += 1;
            bySource[src].tickets += o.quantity;
            bySource[src].revenue += o.price_per_ticket * o.quantity;
        }

        // By payment method
        const byMethod = {};
        for (const o of orders) {
            const m = o.payment_method || 'unknown';
            if (!byMethod[m]) byMethod[m] = { orders: 0, tickets: 0 };
            byMethod[m].orders += 1;
            byMethod[m].tickets += o.quantity;
        }

        // Price distribution (in euros, per ticket)
        const priceDist = {};
        for (const o of orders) {
            const euros = Math.round(o.price_per_ticket / 100);
            priceDist[euros] = (priceDist[euros] || 0) + o.quantity;
        }

        // Check-in stats
        const checkedIn = tickets.filter(t => t.checked_in).length;

        // Sales over time — group by date
        const salesByDate = {};
        for (const o of orders) {
            const date = o.created_at.slice(0, 10);
            if (!salesByDate[date]) salesByDate[date] = { orders: 0, tickets: 0, revenue: 0 };
            salesByDate[date].orders += 1;
            salesByDate[date].tickets += o.quantity;
            salesByDate[date].revenue += o.price_per_ticket * o.quantity;
        }

        return NextResponse.json({
            summary: {
                totalOrders: orders.length,
                totalTickets,
                grossRevenue,
                netRevenue,
                avgPricePerTicket: totalTickets > 0 ? Math.round(netRevenue / totalTickets) : 0,
            },
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
