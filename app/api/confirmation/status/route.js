import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { signTicketJWT } from '@/lib/jwt';

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
        .select('id, status, buyer_email, buyer_name')
        .eq('stripe_payment_id', paymentIntentId)
        .maybeSingle();

    const ready = !!data && data.status === 'paid';

    if (ready) {
        // Generate the token purely on the fly! No need to save it to the database at all.
        const token = await signTicketJWT({
            buyer_email: data.buyer_email,
            buyer_name: data.buyer_name,
        });
        return NextResponse.json({ ready: true, token });
    }

    return NextResponse.json({ ready: false, token: null });
}
