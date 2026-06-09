import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyJWT } from '@/lib/jwt';

const EVENT_DATE = '2026-08-22';

export async function POST(req) {
    try {
        const body = await req.json();
        const { token, buyer_name, buyer_email, amount } = body;

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

        const supabase = getSupabaseAdmin();
        const { data: existing } = await supabase
            .from('orders')
            .select('id')
            .eq('magic_link_jti', payload.jti)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ error: 'This link has already been used.' }, { status: 409 });
        }

        const baseAmount = amountInt * 100;
        const total = Math.ceil((baseAmount + 25) / 0.985);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: total,
            currency: 'eur',
            metadata: {
                buyer_name: buyer_name.trim(),
                buyer_email: buyer_email.toLowerCase().trim(),
                buyer_phone: '',
                quantity: '1',
                price_per_ticket: String(amountInt * 100),
                base_total: String(baseAmount),
                event_date: EVENT_DATE,
                group_deal: 'false',
                ticket_holders: JSON.stringify([buyer_name.trim()]),
                magic_link_jti: payload.jti,
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
