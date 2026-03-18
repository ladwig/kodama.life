import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * After a successful payment, the confirmation page polls this endpoint
 * to get the buyer's JWT so it can set the ticket_token cookie on the same device.
 * Security: requires knowing the payment_intent ID (only available post-payment in URL).
 */
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const paymentIntentId = searchParams.get('payment_intent');

    if (!paymentIntentId) {
        return NextResponse.json({ ready: false, token: null });
    }

    const supabase = getSupabaseAdmin();
    const { data } = await supabase
        .from('orders')
        .select('id, status, token')
        .eq('stripe_payment_id', paymentIntentId)
        .maybeSingle();

    const ready = !!data && data.status === 'paid';
    return NextResponse.json({ ready, token: ready ? (data.token || null) : null });
}
