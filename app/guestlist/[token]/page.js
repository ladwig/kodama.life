import { verifyJWT, signTicketJWT } from '@/lib/jwt';
import { getSupabaseAdmin } from '@/lib/supabase';
import GuestlistClient from './GuestlistClient';

export default async function GuestlistPage({ params }) {
    const { token } = await params;

    const payload = await verifyJWT(token);
    if (!payload || payload.type !== 'guestlist') {
        return <ErrorState message="This guestlist link is invalid or has expired." />;
    }

    const supabase = getSupabaseAdmin();
    const { data: orders } = await supabase
        .from('orders')
        .select('id, buyer_name, buyer_email, created_at')
        .eq('magic_link_jti', payload.jti)
        .eq('source', 'guestlist')
        .order('created_at', { ascending: true });

    const orderIds = (orders || []).map((o) => o.id);
    let ticketsByOrder = {};
    if (orderIds.length) {
        const { data: tickets } = await supabase
            .from('tickets')
            .select('order_id, ticket_code')
            .in('order_id', orderIds);
        for (const t of tickets || []) ticketsByOrder[t.order_id] = t.ticket_code;
    }

    // Build guest rows with a per-guest PDF download link
    const guests = [];
    for (const o of orders || []) {
        const isPlaceholder = o.buyer_email?.endsWith('@guestlist.local');
        const jwt = await signTicketJWT({ buyer_email: o.buyer_email, buyer_name: o.buyer_name });
        guests.push({
            orderId: o.id,
            name: o.buyer_name,
            email: isPlaceholder ? '' : o.buyer_email,
            code: ticketsByOrder[o.id] || '',
            downloadToken: jwt,
        });
    }

    return (
        <GuestlistClient
            token={token}
            label={payload.label || ''}
            max={payload.uses || 1}
            initialGuests={guests}
        />
    );
}

function ErrorState({ message }) {
    return (
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <p style={{ fontFamily: "'Funnel Display', sans-serif", fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center', maxWidth: '360px' }}>
                {message}
            </p>
        </main>
    );
}
