import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase';

// Min price per ticket in cents
const MIN_PRICE = 2500; // 25 EUR
const STEP = 500; // 5 EUR increments
const MAX_QUANTITY = 10;
const EVENT_DATE = '2026-08-22';

export async function POST(req) {
    try {
        const body = await req.json();
        const { buyer_name, buyer_email, buyer_phone, quantity, price_per_ticket, ticket_holders } = body;

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
        if ((price_per_ticket - MIN_PRICE) % STEP !== 0) {
            return NextResponse.json({ error: 'Preis muss in 5 €-Schritten gewählt werden.' }, { status: 400 });
        }
        if (!ticket_holders || ticket_holders.length !== quantity) {
            return NextResponse.json({ error: 'Bitte alle Ticket-Inhaber angeben.' }, { status: 400 });
        }
        if (ticket_holders.some((name) => !name?.trim())) {
            return NextResponse.json({ error: 'Alle Ticket-Inhaber müssen einen Namen haben.' }, { status: 400 });
        }

        const total = quantity * price_per_ticket;

        // Check if buyer is a newsletter subscriber (for pre-fill info)
        const supabase = getSupabaseAdmin();
        let subscriberName = null;
        const { data: subscriber } = await supabase
            .from('subscribers')
            .select('name')
            .eq('email', buyer_email.toLowerCase())
            .maybeSingle();
        if (subscriber?.name) subscriberName = subscriber.name;

        // Create Stripe PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: total,
            currency: 'eur',
            metadata: {
                buyer_name,
                buyer_email: buyer_email.toLowerCase(),
                buyer_phone: buyer_phone || '',
                quantity: String(quantity),
                price_per_ticket: String(price_per_ticket),
                event_date: EVENT_DATE,
                ticket_holders: JSON.stringify(ticket_holders.map((h) => h.trim())),
            },
            automatic_payment_methods: { enabled: true },
        });

        return NextResponse.json({
            client_secret: paymentIntent.client_secret,
            subscriber_name: subscriberName,
        });
    } catch (err) {
        console.error('create-intent error:', err);
        return NextResponse.json({ error: 'Fehler beim Erstellen der Zahlung.' }, { status: 500 });
    }
}
