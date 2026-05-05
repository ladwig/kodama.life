import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { signTicketJWT } from '@/lib/jwt';

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const paymentIntentId = searchParams.get('payment_intent');

    if (!paymentIntentId) {
        return NextResponse.json({ ready: false });
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from('orders')
        .select('id, status, buyer_email, buyer_name')
        .eq('stripe_payment_id', paymentIntentId)
        .maybeSingle();

    if (error) {
        console.error('[confirmation/status] DB error:', error.message);
        return NextResponse.json({ ready: false, db_error: true });
    }

    if (!data) {
        console.log('[confirmation/status] No order found for payment_intent:', paymentIntentId);
        return NextResponse.json({ ready: false });
    }

    if (data.status !== 'paid') {
        console.log('[confirmation/status] Order found but status is:', data.status);
        return NextResponse.json({ ready: false });
    }

    const { data: ticketsCheck, error: ticketsError } = await supabase
        .from('tickets')
        .select('id')
        .eq('order_id', data.id)
        .limit(1);

    if (ticketsError) {
        console.error('[confirmation/status] Tickets DB error:', ticketsError.message);
        return NextResponse.json({ ready: false, db_error: true });
    }

    if (!ticketsCheck?.length) {
        return NextResponse.json({ ready: false });
    }

    const token = await signTicketJWT({
        buyer_email: data.buyer_email,
        buyer_name: data.buyer_name,
    });
    return NextResponse.json({ ready: true, token });
}
