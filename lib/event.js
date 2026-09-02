// Everything event- and brand-specific lives here. These are the defaults;
// Vercel Edge Config overrides price and group-deal at runtime (see lib/config.js). To reuse this app for
// another event: change this file, swap the copy/assets under app/ + public/,
// point the env vars at new Supabase/Resend/payment accounts. Nothing else
// hardcodes the event.
export const EVENT = {
    name: 'coppi',
    date: '2026-08-22',
    ticketPrefix: 'CO-',
    // Digits give CO-4821 but only 10,000 codes. For 1M, use the
    // ambiguity-free alphabet: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.
    codeChars: '0123456789',
    minPrice: 30,            // € floor per ticket
    maxPrice: 60,            // > minPrice → sliding scale in €5 steps; = minPrice → one fixed price
    groupDeal: { size: 4, pay: 3 }, // e.g. 4 tickets for the price of 3; null → off
    currency: 'eur',
    // Processor fee passed on to the buyer: percent of gross + fixed cents.
    // Stripe standard EU card pricing. SumUp/others: change these two numbers.
    fee: { percent: 0.015, fixedCents: 25 },
};

// e.g. "22 August 2026" — for mails and ticket faces.
export const eventDateLong = () =>
    new Date(EVENT.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

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

export const CODE_LENGTH = 4;

export function ticketCode() {
    const chars = EVENT.codeChars;
    let code = EVENT.ticketPrefix;
    for (let i = 0; i < CODE_LENGTH; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

// Retries until the code is free, then gives up loudly rather than spinning —
// ponytail: 10 digits ^ 4 = 10,000 codes, so this is only tight past a few
// thousand tickets; widen EVENT.codeChars to the letter alphabet for 1M.
export async function uniqueTicketCode(supabase) {
    for (let attempt = 0; attempt < 50; attempt++) {
        const code = ticketCode();
        const { data } = await supabase.from('tickets').select('id').eq('ticket_code', code).maybeSingle();
        if (!data) return code;
    }
    throw new Error('No free ticket code found — the code space is full, widen EVENT.codeChars');
}
