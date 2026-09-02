import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { signTicketJWT } from '@/lib/jwt';
import { getChefPassword } from '@/lib/config';
import { baseUrl, uniqueTicketCode } from '@/lib/event';
import { getResend } from '@/lib/ticketMail';

const resend = getResend();

export async function POST(req) {
    try {
        const body = await req.json();
        const { password, name, email, quantity = 1, price_per_ticket = 0 } = body;

        if (password !== await getChefPassword()) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!name || !email) {
            return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        const paymentId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const status = 'paid';
        const paymentSource = 'offline';

        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                stripe_payment_id: paymentId,
                buyer_email: email,
                buyer_name: name,
                buyer_phone: null,
                quantity: parseInt(quantity, 10),
                price_per_ticket: parseInt(price_per_ticket, 10),
                total_price: parseInt(price_per_ticket, 10) * parseInt(quantity, 10),
                status,
                payment_method: paymentSource,
                source: 'offline',
            })
            .select()
            .single();

        if (orderError) throw orderError;

        const ticketsToInsert = [];
        for (let i = 0; i < quantity; i++) {
            const ticket_code = await uniqueTicketCode(supabase);
            ticketsToInsert.push({
                order_id: order.id,
                ticket_code,
                holder_name: name,
            });
        }

        const { data: tickets, error: ticketError } = await supabase
            .from('tickets')
            .insert(ticketsToInsert)
            .select();

        if (ticketError) throw ticketError;

        const jwt = await signTicketJWT({
            buyer_email: email,
            buyer_name: name,
        });

        const base = baseUrl();
        const magicLink = `${base}/api/auth/verify?token=${jwt}`;
        const pdfLink = `${base}/api/tickets/download?token=${jwt}`;

        try {
            if (resend) {
                await resend.contacts.create({
                    email,
                    firstName: name,
                    unsubscribed: false,
                });

                if (process.env.RESEND_SEGMENT_TICKET_HOLDERS_ID) {
                    await resend.contacts.segments.add({
                        email,
                        segmentId: process.env.RESEND_SEGMENT_TICKET_HOLDERS_ID,
                    });
                }

                await resend.emails.send({
                    from: process.env.RESEND_FROM_ADDRESS,
                    to: email,
                    subject: '🌿 Dein Kodama-Ticket',
                    template: {
                        id: process.env.RESEND_TEMPLATE_TICKET_PURCHASE_CONFIRMATION_ID,
                        variables: {
                            firstName: name,
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
            }
        } catch (mailErr) {
            console.warn('Email sending failed:', mailErr.message);
        }

        return NextResponse.json({ success: true, tickets });
    } catch (err) {
        console.error('Offline ticket creation error:', err);
        return NextResponse.json({ error: 'Ticket creation failed' }, { status: 500 });
    }
}
