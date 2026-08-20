import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getChefPassword } from '@/lib/config';
import { sendTicketMail, mailEnabled } from '@/lib/ticketMail';

export async function POST(req) {
    try {
        const { password, ticket_code } = await req.json();

        if (password !== await getChefPassword()) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (!ticket_code) {
            return NextResponse.json({ error: 'ticket_code required' }, { status: 400 });
        }
        if (!mailEnabled()) {
            return NextResponse.json({ error: 'Mail provider not configured' }, { status: 503 });
        }

        const supabase = getSupabaseAdmin();
        const { data: ticket, error } = await supabase
            .from('tickets')
            .select('order_id, orders!inner(buyer_email, buyer_name, status)')
            .eq('ticket_code', ticket_code)
            .maybeSingle();

        if (error) throw error;
        if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        if (ticket.orders.status !== 'paid') {
            return NextResponse.json({ error: `Order is ${ticket.orders.status}` }, { status: 400 });
        }
        if (!ticket.orders.buyer_email) {
            return NextResponse.json({ error: 'No email on this order' }, { status: 400 });
        }

        // Resend the whole order's ticket mail — same content the buyer originally got
        const { data: tickets, error: tErr } = await supabase
            .from('tickets')
            .select('ticket_code, holder_name')
            .eq('order_id', ticket.order_id);
        if (tErr) throw tErr;

        const { buyer_email, buyer_name } = ticket.orders;
        try {
            await sendTicketMail({ email: buyer_email, name: buyer_name, tickets });
        } catch (mailErr) {
            console.error('Ticket resend failed:', mailErr.message);
            return NextResponse.json({ error: 'Sending failed' }, { status: 502 });
        }

        return NextResponse.json({ success: true, email: buyer_email, count: tickets.length });
    } catch (err) {
        console.error('Ticket resend error:', err);
        return NextResponse.json({ error: 'Resend failed' }, { status: 500 });
    }
}
