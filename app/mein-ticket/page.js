import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJWT } from '@/lib/jwt';
import { getSupabaseAdmin } from '@/lib/supabase';
import MeinTicketClient from './MeinTicketClient';

export const metadata = {
    title: 'Meine Tickets – Kodama',
};

async function getBuyerData(email) {
    const supabase = getSupabaseAdmin();

    const { data: orders } = await supabase
        .from('orders')
        .select('id, quantity, price_per_ticket, total_price, event_date, created_at, status')
        .eq('buyer_email', email)
        .eq('status', 'paid')
        .order('created_at', { ascending: false });

    if (!orders || orders.length === 0) return { orders: [], tickets: [] };

    const orderIds = orders.map((o) => o.id);

    const { data: tickets } = await supabase
        .from('tickets')
        .select('id, ticket_code, holder_name, order_id')
        .in('order_id', orderIds);

    return { orders, tickets: tickets || [] };
}

export default async function MeinTicketPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('ticket_token')?.value;

    if (!token) redirect('/login');

    const payload = await verifyJWT(token);
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
