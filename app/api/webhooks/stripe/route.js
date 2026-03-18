import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase';
import { signTicketJWT, signUnsubscribeJWT } from '@/lib/jwt';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function generateTicketCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'EVT-';
    for (let i = 0; i < 4; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

async function generateUniqueTicketCode(supabase) {
    let code, exists;
    do {
        code = generateTicketCode();
        const { data } = await supabase
            .from('tickets')
            .select('id')
            .eq('ticket_code', code)
            .maybeSingle();
        exists = !!data;
    } while (exists);
    return code;
}

export async function POST(req) {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    let event;
    try {
        event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    if (event.type !== 'payment_intent.succeeded') {
        return NextResponse.json({ received: true });
    }

    const pi = event.data.object;
    const supabase = getSupabaseAdmin();

    // Idempotency check
    const { data: existingOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('stripe_payment_id', pi.id)
        .maybeSingle();

    if (existingOrder) {
        console.log('Duplicate webhook for payment:', pi.id);
        return NextResponse.json({ received: true });
    }

    const meta = pi.metadata;
    const quantity = parseInt(meta.quantity, 10);
    const price_per_ticket = parseInt(meta.price_per_ticket, 10);
    const ticket_holders = JSON.parse(meta.ticket_holders || '[]');

    try {
        // 1. Create order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                stripe_payment_id: pi.id,
                buyer_email: meta.buyer_email,
                buyer_name: meta.buyer_name,
                buyer_phone: meta.buyer_phone || null,
                quantity,
                price_per_ticket,
                total_price: pi.amount,
                status: 'paid',
                event_date: meta.event_date || null,
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // 2. Create tickets
        const ticketsToInsert = [];
        for (let i = 0; i < quantity; i++) {
            const ticket_code = await generateUniqueTicketCode(supabase);
            ticketsToInsert.push({
                order_id: order.id,
                ticket_code,
                holder_name: ticket_holders[i] || meta.buyer_name,
            });
        }

        const { data: tickets, error: ticketError } = await supabase
            .from('tickets')
            .insert(ticketsToInsert)
            .select();

        if (ticketError) throw ticketError;

        // 3. Generate JWT for buyer
        const jwt = await signTicketJWT({
            buyer_email: meta.buyer_email,
            buyer_name: meta.buyer_name,
        });

        // 4. Generate unsubscribe token
        const unsubToken = await signUnsubscribeJWT(meta.buyer_email);

        // 5. Build URLs
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://kodama.life';
        const magicLink = `${baseUrl}/api/auth/verify?token=${jwt}`;
        const unsubLink = `${baseUrl}/api/newsletter/unsubscribe?token=${unsubToken}`;

        // 6. Send confirmation email via Resend
        if (resend) {
            const ticketList = tickets
                .map((t) => `<li><strong>${t.ticket_code}</strong> – ${t.holder_name}</li>`)
                .join('');

            await resend.emails.send({
                from: process.env.RESEND_FROM_ADDRESS || 'tickets@kodama.life',
                to: meta.buyer_email,
                subject: `🌿 Dein Kodama-Ticket – 22. August 2026`,
                html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
            <h1 style="color: #4a6741;">Willkommen, ${meta.buyer_name}! 🌿</h1>
            <p>Du hast erfolgreich ${quantity} Ticket${quantity > 1 ? 's' : ''} für <strong>Kodama am 22. August 2026</strong> am Kiekebusch See gekauft.</p>

            <h2>Deine Tickets</h2>
            <ul>${ticketList}</ul>

            <p>Zeige deinen Ticket-Code beim Einlass vor.</p>

            <h2>Deine Ticket-Seite</h2>
            <p>Rufe jederzeit deine Tickets ab – auch auf anderen Geräten:</p>
            <p><a href="${magicLink}" style="display:inline-block; background:#4a6741; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">Meine Tickets anzeigen</a></p>
            <p style="font-size:0.8em; color:#666;">Dieser Link ist 90 Tage gültig.</p>

            <hr style="margin: 2rem 0; border: none; border-top: 1px solid #eee;" />
            <p style="font-size:0.75em; color:#999;">
              Du möchtest keine E-Mails mehr erhalten?
              <a href="${unsubLink}">Abmelden</a>
            </p>
          </div>
        `,
            });
        } else if (process.env.MAIL_WEBHOOK_URL) {
            // Fallback: trigger external webhook (Make/n8n)
            await fetch(process.env.MAIL_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    buyer_email: meta.buyer_email,
                    buyer_name: meta.buyer_name,
                    order_id: order.id,
                    tickets,
                    magic_link: magicLink,
                }),
            });
        }

        // 7. Update order with token (for reference)
        await supabase
            .from('orders')
            .update({ token: jwt })
            .eq('id', order.id);

        return NextResponse.json({ received: true });
    } catch (err) {
        console.error('Webhook processing error:', err);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}
