import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getPricing, getGroupDeal } from '@/lib/config';
import { EVENT, grossUpCents } from '@/lib/event';

const STEP = 500; // 5 EUR increments
const MAX_QUANTITY = 10;

export async function POST(req) {
    try {
        const body = await req.json();
        const { buyer_name, buyer_email, buyer_phone, quantity, price_per_ticket, ticket_holders } = body;

        const [pricing, deal] = await Promise.all([getPricing(), getGroupDeal()]);
        const MIN_PRICE = pricing.min * 100; // euros → cents
        const MAX_PRICE = pricing.max * 100;
        // Group deal only counts if one is configured — can't be forced via the API
        const group_deal = !!body.group_deal && !!deal;

        // Validation
        if (!buyer_name || !buyer_email) {
            return NextResponse.json({ error: 'Name und E-Mail sind Pflichtfelder.' }, { status: 400 });
        }
        if (!buyer_email.includes('@')) {
            return NextResponse.json({ error: 'Ungültige E-Mail-Adresse.' }, { status: 400 });
        }
        if (!quantity || quantity < 1 || quantity > MAX_QUANTITY) {
            return NextResponse.json({ error: `Anzahl muss zwischen 1 und ${MAX_QUANTITY} liegen.` }, { status: 400 });
        }
        if (!price_per_ticket || price_per_ticket < MIN_PRICE) {
            return NextResponse.json({ error: `Mindestpreis ist ${MIN_PRICE / 100} €.` }, { status: 400 });
        }
        if (price_per_ticket > MAX_PRICE) {
            return NextResponse.json({ error: `Höchstpreis ist ${MAX_PRICE / 100} €.` }, { status: 400 });
        }
        if ((price_per_ticket - MIN_PRICE) % STEP !== 0) {
            return NextResponse.json({ error: 'Preis muss in 5 €-Schritten gewählt werden.' }, { status: 400 });
        }
        if (!ticket_holders || ticket_holders.length !== quantity) {
            return NextResponse.json({ error: 'Bitte alle Ticket-Inhaber angeben.' }, { status: 400 });
        }
        if (ticket_holders.some((name) => !name?.trim())) {
            return NextResponse.json({ error: 'Alle Ticket-Inhaber müssen einen Namen haben.' }, { status: 400 });
        }
        if (group_deal && quantity !== deal.size) {
            return NextResponse.json({ error: `Gruppenticket ist nur für genau ${deal.size} Personen.` }, { status: 400 });
        }

        // Group deal: pay for deal.pay of the deal.size tickets.
        const baseTotal = (group_deal ? deal.pay : quantity) * price_per_ticket;
        // Pass the processor fee on so we receive the full base amount
        const total = grossUpCents(baseTotal);

        // Create Stripe PaymentIntent
        const paymentIntent = await getStripe().paymentIntents.create({
            amount: total,
            currency: EVENT.currency,
            metadata: {
                buyer_name,
                buyer_email: buyer_email.toLowerCase(),
                buyer_phone: buyer_phone || '',
                quantity: String(quantity),
                price_per_ticket: String(price_per_ticket),
                base_total: String(baseTotal),
                event_date: EVENT.date,
                group_deal: group_deal ? 'true' : 'false',
                ticket_holders: JSON.stringify(ticket_holders.map((h) => h.trim())),
            },
            automatic_payment_methods: { enabled: true },
        });

        const response = NextResponse.json({
            client_secret: paymentIntent.client_secret,
            min_price: MIN_PRICE / 100,
        });
        response.cookies.set('checkout_pi', paymentIntent.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 2, // 2 hours — enough to complete checkout
            path: '/',
        });
        return response;
    } catch (err) {
        console.error('create-intent error:', err);
        return NextResponse.json({ error: 'Fehler beim Erstellen der Zahlung.' }, { status: 500 });
    }
}
