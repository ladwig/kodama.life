import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase';
import { signTicketJWT } from '@/lib/jwt';
import { EVENT, baseUrl, mailFrom, uniqueTicketCode } from '@/lib/event';
import { getResend } from '@/lib/ticketMail';
import { getNotifications } from '@/lib/config';

// Only init Resend if the key looks real (not the placeholder 're_...')
const resend = getResend();

export async function POST(req) {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    let event;
    try {
        event = getStripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    if (event.type !== 'payment_intent.succeeded') {
        return NextResponse.json({ received: true });
    }

    const pi = event.data.object;
    const supabase = getSupabaseAdmin();
    const meta = pi.metadata;

    // Idempotency check — by stripe_payment_id
    const { data: existingOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('stripe_payment_id', pi.id)
        .maybeSingle();

    if (existingOrder) {
        console.log('Duplicate webhook for payment:', pi.id);
        return NextResponse.json({ received: true });
    }

    // Magic link overuse guard — reject once the link's total tickets are exhausted
    if (meta.magic_link_jti) {
        const maxUses = parseInt(meta.magic_link_uses, 10) || 1;
        const { data: soldRows } = await supabase
            .from('orders')
            .select('quantity')
            .eq('magic_link_jti', meta.magic_link_jti);
        const sold = (soldRows || []).reduce((s, r) => s + (r.quantity || 0), 0);
        if (sold >= maxUses) {
            console.log('Magic link fully redeemed:', meta.magic_link_jti);
            return NextResponse.json({ received: true });
        }
    }
    const quantity = parseInt(meta.quantity, 10);
    const price_per_ticket = parseInt(meta.price_per_ticket, 10);
    const ticket_holders = JSON.parse(meta.ticket_holders || '[]');

    try {
        console.log('[webhook] Processing payment:', pi.id, '| buyer:', meta.buyer_email);

        const notify = await getNotifications();

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
                source: meta.source || 'online',
                magic_link_jti: meta.magic_link_jti || null,
            })
            .select()
            .single();

        if (orderError) { console.error('[webhook] Order insert failed:', orderError); throw orderError; }
        console.log('[webhook] Step 1 done: order', order.id);

        // 2. Create tickets
        console.log('[webhook] Step 2: inserting', quantity, 'ticket(s)...');
        const ticketsToInsert = [];
        for (let i = 0; i < quantity; i++) {
            const ticket_code = await uniqueTicketCode(supabase);
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
        const base = baseUrl();
        const magicLink = `${base}/api/auth/verify?token=${jwt}`;
        const pdfLink = `${base}/api/tickets/download?token=${jwt}`;

        // 5. Send confirmation email (non-fatal — don't let email failure kill the webhook)
        try {
            if (resend) {
                // 6a. Contact anlegen / aktualisieren (idempotent)
                try {
                    await resend.contacts.create({
                        email: meta.buyer_email,
                        firstName: meta.buyer_name,
                        unsubscribed: false,
                    });
                } catch (contactErr) {
                    console.warn('[webhook] Contact create failed (non-fatal):', contactErr.message);
                }

                // 6b. In "Ticket Holders" Segment eintragen
                if (process.env.RESEND_SEGMENT_TICKET_HOLDERS_ID) {
                    try {
                        await resend.contacts.segments.add({
                            email: meta.buyer_email,
                            segmentId: process.env.RESEND_SEGMENT_TICKET_HOLDERS_ID,
                        });
                    } catch (segErr) {
                        console.warn('[webhook] Segment add failed (non-fatal):', segErr.message);
                    }
                }

                // 6c. Confirmation Mail via Resend Template
                const resendResponse = await resend.emails.send({
                    from: mailFrom(),
                    to: meta.buyer_email,
                    subject: `Your ${EVENT.name} ticket`,
                    template: {
                        id: process.env.RESEND_TEMPLATE_TICKET_PURCHASE_CONFIRMATION_ID,
                        variables: {
                            firstName: meta.buyer_name,
                            magicLink,
                            pdfLink,
                            tickets: tickets.map((t) => ({
                                code: t.ticket_code,
                                holderName: t.holder_name || meta.buyer_name,
                                qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${t.ticket_code}`,
                            })),
                        },
                    },
                });

                if (resendResponse.error) {
                    console.error('[webhook] Resend email failed:', JSON.stringify(resendResponse.error));
                } else {
                    console.log('[webhook] Confirmation email sent to', meta.buyer_email, '| ID:', resendResponse.data?.id);
                }

                // 6d. Internal per-sale notification mail — Edge Config
                // email_notifications, off by default (Telegram usually covers it).
                if (notify.email && process.env.NOTIFY_EMAIL) {
                    await resend.emails.send({
                        from: mailFrom(),
                        to: process.env.NOTIFY_EMAIL,
                        subject: `🎟 ${quantity} ticket(s) sold — ${(pi.amount / 100).toFixed(2)} €`,
                        text: `${meta.buyer_name} (${meta.buyer_email}) bought ${quantity} ticket(s) for ${(pi.amount / 100).toFixed(2)} €.\n\nCodes: ${tickets.map((t) => t.ticket_code).join(', ')}`,
                    });
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

        // 7. Telegram group notification — Edge Config telegram_notifications
        if (notify.telegram && process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
            let tgError = null;
            try {
                const text = `🎟 New ticket sold\n${meta.buyer_name} (${meta.buyer_email}) bought ${quantity} ticket(s) for ${(pi.amount / 100).toFixed(2)} €.`;
                const tgRes = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text }),
                });
                if (!tgRes.ok) {
                    const tgBody = await tgRes.text();
                    tgError = `HTTP ${tgRes.status}: ${tgBody}`;
                    console.warn('[webhook] Telegram API error:', tgError);
                }
            } catch (tgErr) {
                tgError = tgErr.message;
                console.warn('[webhook] Telegram notification failed (non-fatal):', tgError);
            }
            if (tgError && process.env.NOTIFY_EMAIL && resend) {
                try {
                    await resend.emails.send({
                        from: mailFrom(),
                        to: process.env.NOTIFY_EMAIL,
                        subject: `⚠️ Telegram notification failed`,
                        text: `Telegram notification failed for the sale to ${meta.buyer_name} (${meta.buyer_email}).\n\nError: ${tgError}`,
                    });
                } catch (errMailErr) {
                    console.warn('[webhook] Telegram error mail failed:', errMailErr.message);
                }
            }
        } else if (notify.telegram) {
            console.warn('[webhook] Telegram not configured — TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing');
        }

        return NextResponse.json({ received: true });
    } catch (err) {
        console.error('Webhook processing error:', err?.message || err, '| code:', err?.code);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}
