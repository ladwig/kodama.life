import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getChefPassword } from '@/lib/config';
import { sendTicketMail, mailEnabled } from '@/lib/ticketMail';
import { uniqueTicketCode } from '@/lib/event';

/**
 * Put names straight on the guestlist — no link involved.
 * POST { password, names: "Ada Lovelace, Grace Hopper", email?, label? }
 * An email is only useful for a single name, and sends them their ticket.
 */
export async function POST(req) {
    try {
        const { password, names, email, label } = await req.json();

        if (password !== await getChefPassword()) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const list = String(names || '')
            .split(',')
            .map((n) => n.trim().replace(/\s+/g, ' '))
            .filter(Boolean);

        if (list.length === 0) {
            return NextResponse.json({ error: 'Enter at least one name.' }, { status: 400 });
        }

        const mailTo = list.length === 1 ? (email || '').trim().toLowerCase() : '';
        const supabase = getSupabaseAdmin();
        const added = [];
        const failed = [];

        for (const name of list) {
            try {
                const code = await uniqueTicketCode(supabase);
                const slug = name.toLowerCase().replace(/[^a-z]+/g, '-');
                const { data: order, error: orderErr } = await supabase
                    .from('orders')
                    .insert({
                        stripe_payment_id: `guestlist_manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                        buyer_email: mailTo || `gl-manual-${slug}-${Math.random().toString(36).slice(2, 8)}@guestlist.local`,
                        buyer_name: name,
                        quantity: 1,
                        price_per_ticket: 0,
                        total_price: 0,
                        status: 'paid',
                        payment_method: 'guestlist',
                        source: 'guestlist',
                        guestlist_label: (label || '').trim() || 'manual',
                    })
                    .select()
                    .single();
                if (orderErr) throw orderErr;

                const { error: ticketErr } = await supabase
                    .from('tickets')
                    .insert({ order_id: order.id, ticket_code: code, holder_name: name });
                if (ticketErr) throw ticketErr;

                if (mailTo && mailEnabled()) {
                    try {
                        await sendTicketMail({ email: mailTo, name, tickets: [{ ticket_code: code, holder_name: name }] });
                    } catch (mailErr) {
                        console.warn('Guestlist mail failed for', name, mailErr.message);
                    }
                }

                added.push({ name, code });
            } catch (err) {
                console.error('Guestlist add failed for', name, err);
                failed.push({ name, error: err.message });
            }
        }

        return NextResponse.json({ added, failed, emailed: !!mailTo });
    } catch (err) {
        console.error('Guestlist add error:', err);
        return NextResponse.json({ error: 'Adding failed' }, { status: 500 });
    }
}
