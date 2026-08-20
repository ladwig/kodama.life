import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getChefPassword } from '@/lib/config';
import { sendTicketMail, mailEnabled } from '@/lib/ticketMail';

// Sending is sequential and throttled, so give the function room.
export const maxDuration = 300;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Re-send the ticket mail to every buyer of a paid, non-guestlist order.
 * One mail per buyer email, containing all their tickets.
 *
 * POST { password, confirm: true, limit?: 50, offset?: 0, only?: ["a@b.c"] }
 * Without confirm it's a dry run: reports who would get mail, sends nothing.
 * Run in batches with offset if there are more buyers than the limit.
 */
export async function POST(req) {
    return run(await req.json());
}

/**
 * Same thing from the address bar:
 * /api/chef/resend-all?password=…                       → dry run
 * /api/chef/resend-all?password=…&confirm=1&offset=0    → sends
 */
export async function GET(req) {
    const q = req.nextUrl.searchParams;
    return run({
        password: q.get('password'),
        confirm: q.get('confirm') === '1' || q.get('confirm') === 'true',
        limit: q.get('limit') ? parseInt(q.get('limit'), 10) : 50,
        offset: q.get('offset') ? parseInt(q.get('offset'), 10) : 0,
        only: q.get('only') ? q.get('only').split(',') : undefined,
    });
}

async function run({ password, confirm = false, limit = 50, offset = 0, only }) {
    try {

        if (password !== await getChefPassword()) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (!mailEnabled()) {
            return NextResponse.json({ error: 'Mail provider not configured' }, { status: 503 });
        }

        const supabase = getSupabaseAdmin();
        const { data: orders, error: oErr } = await supabase
            .from('orders')
            .select('id, buyer_email, buyer_name, source')
            .eq('status', 'paid')
            .order('created_at', { ascending: true });
        if (oErr) throw oErr;

        // Guestlist guests get their own mail and often have a placeholder address
        const onlySet = Array.isArray(only) && only.length
            ? new Set(only.map((e) => String(e).trim().toLowerCase()))
            : null;
        const relevant = (orders || []).filter((o) =>
            o.source !== 'guestlist' &&
            o.buyer_email &&
            !o.buyer_email.endsWith('@guestlist.local') &&
            (!onlySet || onlySet.has(o.buyer_email.toLowerCase()))
        );

        // One mail per buyer, covering every ticket they hold
        const buyers = new Map();
        for (const o of relevant) {
            const key = o.buyer_email.toLowerCase();
            if (!buyers.has(key)) buyers.set(key, { email: o.buyer_email, name: o.buyer_name, orderIds: [] });
            buyers.get(key).orderIds.push(o.id);
        }

        const all = [...buyers.values()];
        const batch = all.slice(offset, offset + limit);

        if (!confirm) {
            return NextResponse.json({
                dryRun: true,
                buyersTotal: all.length,
                wouldSend: batch.length,
                nextOffset: offset + batch.length < all.length ? offset + batch.length : null,
                recipients: batch.map((b) => b.email),
            });
        }

        const { data: tickets, error: tErr } = await supabase
            .from('tickets')
            .select('order_id, ticket_code, holder_name')
            .in('order_id', batch.flatMap((b) => b.orderIds));
        if (tErr) throw tErr;

        const byOrder = {};
        for (const t of tickets || []) (byOrder[t.order_id] ||= []).push(t);

        const sent = [];
        const failed = [];
        for (const b of batch) {
            const theirs = b.orderIds.flatMap((id) => byOrder[id] || []);
            if (!theirs.length) {
                failed.push({ email: b.email, error: 'no tickets found' });
                continue;
            }
            try {
                await sendTicketMail({ email: b.email, name: b.name, tickets: theirs });
                sent.push(b.email);
            } catch (err) {
                console.error('Resend-all failed for', b.email, err.message);
                failed.push({ email: b.email, error: err.message });
            }
            await sleep(600); // stay under the Resend rate limit
        }

        return NextResponse.json({
            buyersTotal: all.length,
            sent: sent.length,
            failed,
            nextOffset: offset + batch.length < all.length ? offset + batch.length : null,
        });
    } catch (err) {
        console.error('Resend-all error:', err);
        return NextResponse.json({ error: 'Resend-all failed' }, { status: 500 });
    }
}
