import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJWT } from '@/lib/jwt';
import { getSupabaseAdmin } from '@/lib/supabase';
import MeinTicketClient from './MeinTicketClient';

async function getBuyerData(email) {
    const supabase = getSupabaseAdmin();

    const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, quantity, price_per_ticket, total_price, created_at, status')
        .eq('buyer_email', email)
        .eq('status', 'paid')
        .order('created_at', { ascending: false });

    if (ordersError) console.error('[mein-ticket] orders error:', ordersError.message);
    if (!orders?.length) return { orders: [], tickets: [] };

    const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('id, ticket_code, holder_name, order_id')
        .in('order_id', orders.map((o) => o.id));

    if (ticketsError) console.error('[mein-ticket] tickets error:', ticketsError.message);
    return { orders, tickets: tickets || [] };
}

export default async function MeinTicketPage() {
    const token = (await cookies()).get('ticket_token')?.value;
    const payload = token ? await verifyJWT(token) : null;
    if (!payload?.buyer_email) redirect('/login');

    const { orders, tickets } = await getBuyerData(payload.buyer_email);
    return (
        <MeinTicketClient
            buyer={{ email: payload.buyer_email, name: payload.buyer_name }}
            orders={orders}
            tickets={tickets}
        />
    );
}
