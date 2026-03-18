import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase';
import { signTicketJWT, signUnsubscribeJWT } from '@/lib/jwt';
import { Resend } from 'resend';

// Only init Resend if the key looks real (not the placeholder 're_...')
const resend = (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.endsWith('_...'))
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

function generateTicketCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'KOD-';
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
    const signature = req.headers.get('stripe-signature');

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
        console.log('[webhook] Processing payment:', pi.id, '| buyer:', meta.buyer_email);

        // 1. Create order
        console.log('[webhook] Step 1: inserting order...');
        const paymentSource = `stripe_${pi.payment_method_types?.[0] || 'unknown'}`;

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
                payment_method: paymentSource,
                source: 'online',
            })
            .select()
            .single();

        if (orderError) { console.error('[webhook] Order insert failed:', orderError); throw orderError; }
        console.log('[webhook] Step 1 done: order', order.id);

        // 2. Create tickets
        console.log('[webhook] Step 2: inserting', quantity, 'ticket(s)...');
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

        if (ticketError) { console.error('[webhook] Ticket insert failed:', ticketError); throw ticketError; }
        console.log('[webhook] Step 2 done:', tickets.map(t => t.ticket_code));

        // 3. Generate JWT for buyer
        console.log('[webhook] Step 3: signing JWT...');
        const jwt = await signTicketJWT({
            buyer_email: meta.buyer_email,
            buyer_name: meta.buyer_name,
        });
        console.log('[webhook] Step 3 done.');

        // 4. Build URLs
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://kodama.life';
        const magicLink = `${baseUrl}/api/auth/verify?token=${jwt}`;
        const pdfLink = `${baseUrl}/api/tickets/download?token=${jwt}`;

        // 5. Send confirmation email (non-fatal — don't let email failure kill the webhook)
        try {
            if (resend) {
                // 6a. Contact anlegen / aktualisieren (idempotent)
                await resend.contacts.create({
                    email: meta.buyer_email,
                    firstName: meta.buyer_name,  // voller Name z.B. "Daniel Ladwig" → {{firstName}}
                    unsubscribed: false,
                });

                // 6b. In "Ticket Holders" Segment eintragen
                if (process.env.RESEND_SEGMENT_TICKET_HOLDERS_ID) {
                    await resend.contacts.segments.add({
                        email: meta.buyer_email,
                        segmentId: process.env.RESEND_SEGMENT_TICKET_HOLDERS_ID,
                    });
                }

                // 6c. Confirmation Mail via Resend Template
                const resendResponse = await resend.emails.send({
                    from: process.env.RESEND_FROM_ADDRESS,
                    to: meta.buyer_email,
                    subject: '🌿 Dein Kodama-Ticket', // Resend templates sometimes still require a subject param
                    template: {
                        id: process.env.RESEND_TEMPLATE_TICKET_PURCHASE_CONFIRMATION_ID,
                        variables: {
                            firstName: meta.buyer_name,
                            magicLink,
                            pdfLink,
                            tickets: tickets.map((t) => ({
                                code: t.ticket_code,
                                holderName: t.holder_name,
                                qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${t.ticket_code}`,
                            })),
                        },
                    },
                });

                if (resendResponse.error) {
                    console.error('[webhook] Resend email failed:', resendResponse.error);
                } else {
                    console.log('[webhook] Confirmation email sent to', meta.buyer_email, '| ID:', resendResponse.data?.id);
                }
            } else if (process.env.MAIL_WEBHOOK_URL && !process.env.MAIL_WEBHOOK_URL.trim().startsWith('#')) {
                await fetch(process.env.MAIL_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ buyer_email: meta.buyer_email, buyer_name: meta.buyer_name, order_id: order.id, tickets, magic_link: magicLink }),
                });
            } else {
                console.log('No mail provider configured — skipping email. Magic link:', magicLink);
            }
        } catch (mailErr) {
            console.warn('Email sending failed (non-fatal):', mailErr.message);
        }

        return NextResponse.json({ received: true });
    } catch (err) {
        console.error('Webhook processing error:', err?.message || err, '| code:', err?.code);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}
