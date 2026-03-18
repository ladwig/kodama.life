import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const paymentIntentId = searchParams.get('payment_intent');

    if (!paymentIntentId) {
        return NextResponse.json({ ready: false });
    }

    const supabase = getSupabaseAdmin();
    const { data } = await supabase
        .from('orders')
        .select('id, status')
        .eq('stripe_payment_id', paymentIntentId)
        .maybeSingle();

    return NextResponse.json({ ready: !!data && data.status === 'paid' });
}
