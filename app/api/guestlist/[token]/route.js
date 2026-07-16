import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyLinkTokenIgnoreExpiry, signTicketJWT } from '@/lib/jwt';
import { Resend } from 'resend';

const resend = (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.endsWith('_...'))
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

function generateTicketCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'SQ-';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

async function uniqueTicketCode(supabase) {
    let code, exists;
    do {
        code = generateTicketCode();
        const { data } = await supabase.from('tickets').select('id').eq('ticket_code', code).maybeSingle();
        exists = !!data;
    } while (exists);
    return code;
}

// Placeholder email so buyer_email (NOT NULL) is satisfied when no real email is given.
// Per-guest unique so PDF download (which groups by email) returns just this ticket.
function placeholderEmail(jti) {
    const rand = Math.random().toString(36).slice(2, 10);
    return `gl-${jti.toLowerCase()}-${rand}@guestlist.local`;
}

async function sendTicketEmail({ email, name, code }) {
    if (!resend || !email) return;
    const jwt = await signTicketJWT({ buyer_email: email, buyer_name: name });
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://loveatfirstside.quest';
    const pdfLink = `${baseUrl}/api/tickets/download?token=${jwt}`;
    const magicLink = `${baseUrl}/api/auth/verify?token=${jwt}`;
    await resend.emails.send({
        from: `sidequest <${process.env.RESEND_FROM_ADDRESS}>`,
        to: email,
        subject: '🎟 Your sidequest guestlist ticket',
        html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem;">
                <p>Hi ${name},</p>
                <p>You're on the guestlist for <strong>sidequest</strong> — 22 August 2026.</p>
                <p>Your ticket code: <strong style="font-size:1.2rem;">${code}</strong></p>
                <p><a href="${pdfLink}" style="color:#000;font-weight:700;">Download your ticket (PDF) →</a></p>
                <p style="font-size:12px;color:#888;"><a href="${magicLink}" style="color:#888;">View your ticket online</a></p>
            </div>
        `,
    });
}

async function loadOrderForJti(supabase, orderId, jti) {
    const { data: order } = await supabase
        .from('orders')
        .select('id, buyer_email, buyer_name, magic_link_jti, source')
        .eq('id', orderId)
        .maybeSingle();
    if (!order || order.magic_link_jti !== jti || order.source !== 'guestlist') return null;
    return order;
}

export async function POST(req, { params }) {
    try {
        const { token } = await params;
        const payload = await verifyLinkTokenIgnoreExpiry(token);
        if (!payload || payload.type !== 'guestlist') {
            return NextResponse.json({ error: 'Invalid or expired link.' }, { status: 400 });
        }

        const jti = payload.jti;
        const label = payload.label || null;
        const body = await req.json();
        const action = body.action;
        const supabase = getSupabaseAdmin();

        // Cap comes from the guestlists table (editable), falling back to the token.
        const { data: glRow } = await supabase
            .from('guestlists')
            .select('max_tickets')
            .eq('jti', jti)
            .maybeSingle();
        const uses = glRow?.max_tickets || payload.uses || 1;

        // Count already-issued tickets on this link
        async function issuedCount() {
            const { count } = await supabase
                .from('orders')
                .select('id', { count: 'exact', head: true })
                .eq('magic_link_jti', jti);
            return count || 0;
        }

        // ── Issue a new guest ──
        if (action === 'issue') {
            const name = (body.name || '').trim();
            const email = (body.email || '').trim().toLowerCase();
            if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });

            if ((await issuedCount()) >= uses) {
                return NextResponse.json({ error: 'This guestlist is full.' }, { status: 409 });
            }

            const buyerEmail = email || placeholderEmail(jti);
            const paymentId = `guestlist_${jti}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            const { data: order, error: orderErr } = await supabase
                .from('orders')
                .insert({
                    stripe_payment_id: paymentId,
                    buyer_email: buyerEmail,
                    buyer_name: name,
                    quantity: 1,
                    price_per_ticket: 0,
                    total_price: 0,
                    status: 'paid',
                    payment_method: 'guestlist',
                    source: 'guestlist',
                    magic_link_jti: jti,
                    guestlist_label: label,
                })
                .select()
                .single();
            if (orderErr) throw orderErr;

            const code = await uniqueTicketCode(supabase);
            const { error: ticketErr } = await supabase
                .from('tickets')
                .insert({ order_id: order.id, ticket_code: code, holder_name: name });
            if (ticketErr) throw ticketErr;

            if (email) await sendTicketEmail({ email, name, code });
            const downloadToken = await signTicketJWT({ buyer_email: buyerEmail, buyer_name: name });

            return NextResponse.json({
                guest: { orderId: order.id, name, email: email || '', code, emailed: !!email, downloadToken },
            });
        }

        // ── Rename (ticket stays active, same code) ──
        if (action === 'rename') {
            const name = (body.name || '').trim();
            if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
            const order = await loadOrderForJti(supabase, body.orderId, jti);
            if (!order) return NextResponse.json({ error: 'Guest not found.' }, { status: 404 });

            await supabase.from('orders').update({ buyer_name: name }).eq('id', order.id);
            await supabase.from('tickets').update({ holder_name: name }).eq('order_id', order.id);
            return NextResponse.json({ ok: true });
        }

        // ── Change email → revoke old ticket, issue a fresh one, send it ──
        if (action === 'changeEmail') {
            const email = (body.email || '').trim().toLowerCase();
            const order = await loadOrderForJti(supabase, body.orderId, jti);
            if (!order) return NextResponse.json({ error: 'Guest not found.' }, { status: 404 });

            const name = order.buyer_name;
            // Delete old (cascade removes its ticket → old code no longer scans)
            await supabase.from('orders').delete().eq('id', order.id);

            const buyerEmail = email || placeholderEmail(jti);
            const paymentId = `guestlist_${jti}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            const { data: newOrder, error: orderErr } = await supabase
                .from('orders')
                .insert({
                    stripe_payment_id: paymentId,
                    buyer_email: buyerEmail,
                    buyer_name: name,
                    quantity: 1,
                    price_per_ticket: 0,
                    total_price: 0,
                    status: 'paid',
                    payment_method: 'guestlist',
                    source: 'guestlist',
                    magic_link_jti: jti,
                    guestlist_label: label,
                })
                .select()
                .single();
            if (orderErr) throw orderErr;

            const code = await uniqueTicketCode(supabase);
            await supabase.from('tickets').insert({ order_id: newOrder.id, ticket_code: code, holder_name: name });

            if (email) await sendTicketEmail({ email, name, code });
            const downloadToken = await signTicketJWT({ buyer_email: buyerEmail, buyer_name: name });

            return NextResponse.json({
                guest: { orderId: newOrder.id, name, email: email || '', code, emailed: !!email, downloadToken },
            });
        }

        // ── Remove a guest (frees the slot) ──
        if (action === 'remove') {
            const order = await loadOrderForJti(supabase, body.orderId, jti);
            if (!order) return NextResponse.json({ error: 'Guest not found.' }, { status: 404 });
            await supabase.from('orders').delete().eq('id', order.id);
            return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
    } catch (err) {
        console.error('Guestlist action error:', err);
        return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }
}
