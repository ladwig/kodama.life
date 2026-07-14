import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyJWT } from '@/lib/jwt';

const EVENT_DATE = '2026-08-22';

export async function POST(req) {
    try {
        const body = await req.json();
        const { token, buyer_name, buyer_email, buyer_phone = '', amount, quantity = 1, ticket_holders } = body;

        if (!buyer_name?.trim()) {
            return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
        }
        if (!buyer_email?.includes('@')) {
            return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
        }

        const payload = await verifyJWT(token);
        if (!payload || payload.type !== 'magic_ticket') {
            return NextResponse.json({ error: 'Invalid or expired link.' }, { status: 400 });
        }

        const amountInt = parseInt(amount, 10);
        if (!amountInt || amountInt < payload.price) {
            return NextResponse.json({ error: `Minimum price is €${payload.price}.` }, { status: 400 });
        }

        const qty = Math.max(1, parseInt(quantity, 10) || 1);
        // Holder names from the buyer; fall back to buyer name to fill any gaps.
        const holders = Array.from({ length: qty }, (_, i) =>
            (Array.isArray(ticket_holders) && ticket_holders[i]?.trim()) || buyer_name.trim()
        );

        const supabase = getSupabaseAdmin();
        const uses = payload.uses || 1;
        // Remaining = link's total uses minus tickets already sold through it.
        const { data: soldRows } = await supabase
            .from('orders')
            .select('quantity')
            .eq('magic_link_jti', payload.jti);
        const sold = (soldRows || []).reduce((s, r) => s + (r.quantity || 0), 0);
        const remaining = uses - sold;

        if (remaining <= 0) {
            return NextResponse.json({ error: 'This link has been fully used.' }, { status: 409 });
        }
        if (qty > remaining) {
            return NextResponse.json({ error: `Only ${remaining} ticket${remaining === 1 ? '' : 's'} left on this link.` }, { status: 409 });
        }

        const baseAmount = amountInt * qty * 100;
        const total = Math.ceil((baseAmount + 25) / 0.985);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: total,
            currency: 'eur',
            metadata: {
                buyer_name: buyer_name.trim(),
                buyer_email: buyer_email.toLowerCase().trim(),
                buyer_phone: (buyer_phone || '').trim(),
                quantity: String(qty),
                price_per_ticket: String(amountInt * 100),
                base_total: String(baseAmount),
                event_date: EVENT_DATE,
                group_deal: 'false',
                ticket_holders: JSON.stringify(holders),
                magic_link_jti: payload.jti,
                magic_link_uses: String(uses),
                source: 'magic_link',
            },
            automatic_payment_methods: { enabled: true },
        });

        const response = NextResponse.json({ client_secret: paymentIntent.client_secret });
        response.cookies.set('checkout_pi', paymentIntent.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 2,
            path: '/',
        });
        return response;
    } catch (err) {
        console.error('create-magic-intent error:', err);
        return NextResponse.json({ error: 'Failed to create payment.' }, { status: 500 });
    }
}
