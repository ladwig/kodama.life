import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getChefPassword } from '@/lib/config';

export async function POST(req) {
    try {
        const body = await req.json();
        const { password, ticketCode, action, checkedIn } = body;

        if (password !== await getChefPassword()) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();

        // 1. Verify Ticket
        if (action === 'verify') {
            const { data: ticket, error } = await supabase
                .from('tickets')
                .select('*, orders(status)')
                .eq('ticket_code', ticketCode)
                .single();

            if (error || !ticket) {
                return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
            }

            // Reject tickets whose order is no longer paid (refunded / cancelled / pending)
            if (ticket.orders && ticket.orders.status !== 'paid') {
                return NextResponse.json({ error: `Ticket not valid — order is ${ticket.orders.status}` }, { status: 403 });
            }

            return NextResponse.json({ ticket });
        }

        // 2. Check-in Ticket
        if (action === 'checkin') {
            const isCheckingIn = checkedIn !== undefined ? checkedIn : true;
            const { data: ticket, error } = await supabase
                .from('tickets')
                .update({ 
                    checked_in: isCheckingIn, 
                    checked_in_at: isCheckingIn ? new Date().toISOString() : null
                })
                .eq('ticket_code', ticketCode)
                .select()
                .single();

            if (error) {
                // If columns don't exist, we might get an error. 
                // In a real scenario, we should have added them.
                console.error('Check-in error:', error);
                return NextResponse.json({ error: 'Check-in failed. Database might need update.' }, { status: 500 });
            }

            return NextResponse.json({ success: true, ticket });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (err) {
        console.error('Scan API error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
