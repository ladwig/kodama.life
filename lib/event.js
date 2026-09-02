// Everything event- and brand-specific lives here. These are the defaults;
// Vercel Edge Config overrides price and group-deal at runtime (see lib/config.js). To reuse this app for
// another event: change this file, swap the copy/assets under app/ + public/,
// point the env vars at new Supabase/Resend/payment accounts. Nothing else
// hardcodes the event.
export const EVENT = {
    name: 'sidequest',
    date: '2026-08-22',
    ticketPrefix: 'SQ-',
    minPrice: 30,            // € floor per ticket
    maxPrice: 60,            // > minPrice → sliding scale in €5 steps; = minPrice → one fixed price
    groupDeal: { size: 4, pay: 3 }, // e.g. 4 tickets for the price of 3; null → off
    currency: 'eur',
    // Processor fee passed on to the buyer: percent of gross + fixed cents.
    // Stripe standard EU card pricing. SumUp/others: change these two numbers.
    fee: { percent: 0.015, fixedCents: 25 },
};

export const baseUrl = () => process.env.NEXT_PUBLIC_BASE_URL || 'https://loveatfirstside.quest';

// Server-only (needs RESEND_FROM_ADDRESS).
export const mailFrom = () => `${EVENT.name} <${process.env.RESEND_FROM_ADDRESS}>`;

// Gross amount to charge so we net `baseCents` after processor fees.
export function grossUpCents(baseCents) {
    return Math.ceil((baseCents + EVENT.fee.fixedCents) / (1 - EVENT.fee.percent));
}

// Estimated processor fee on a gross charge, in cents.
export function feeCents(grossCents) {
    return Math.round(grossCents * EVENT.fee.percent + EVENT.fee.fixedCents);
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 — unreadable on a phone
export function ticketCode() {
    let code = EVENT.ticketPrefix;
    for (let i = 0; i < 4; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return code;
}

// Retries until the code is free. 32^4 ≈ 1M codes — fine for a few thousand tickets.
export async function uniqueTicketCode(supabase) {
    let code, exists;
    do {
        code = ticketCode();
        const { data } = await supabase.from('tickets').select('id').eq('ticket_code', code).maybeSingle();
        exists = !!data;
    } while (exists);
    return code;
}
