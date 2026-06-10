import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getMinTicketPrice } from '@/lib/config';

const STEP = 500; // 5 EUR increments
const MAX_QUANTITY = 10;
const EVENT_DATE = '2026-08-22';

export async function POST(req) {
    try {
        const body = await req.json();
        const { buyer_name, buyer_email, buyer_phone, quantity, price_per_ticket, ticket_holders, group_deal } = body;

        const MIN_PRICE = (await getMinTicketPrice()) * 100; // euros → cents

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
        if (group_deal && quantity !== 4) {
            return NextResponse.json({ error: 'Gruppenticket ist nur für genau 4 Personen.' }, { status: 400 });
        }

        const baseTotal = group_deal ? (quantity - 1) * price_per_ticket : quantity * price_per_ticket;
        // Cover Stripe fees (1.5% + €0.25) so we receive the full base amount
        const total = Math.ceil((baseTotal + 25) / 0.985);

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
                base_total: String(baseTotal),
                event_date: EVENT_DATE,
                group_deal: group_deal ? 'true' : 'false',
                ticket_holders: JSON.stringify(ticket_holders.map((h) => h.trim())),
            },
            automatic_payment_methods: { enabled: true },
        });

        const response = NextResponse.json({
            client_secret: paymentIntent.client_secret,
            subscriber_name: subscriberName,
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
