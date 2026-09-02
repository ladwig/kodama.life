import { Resend } from 'resend';
import { signTicketJWT } from '@/lib/jwt';
import { EVENT, baseUrl, mailFrom } from '@/lib/event';

// null when no real key is configured (placeholder 're_...' counts as none),
// so every caller can just check `if (resend)` and skip sending locally.
let client;
export function getResend() {
    if (client === undefined) {
        const key = process.env.RESEND_API_KEY;
        client = (key && !key.endsWith('_...')) ? new Resend(key) : null;
    }
    return client;
}

export const mailEnabled = () => !!getResend();

/**
 * Send (or re-send) the ticket confirmation mail — same Resend template the
 * buyer got at checkout. `tickets` is [{ ticket_code, holder_name }].
 * Throws on failure so callers can report it.
 */
export async function sendTicketMail({ email, name, tickets }) {
    const resend = getResend();
    if (!resend) throw new Error('Mail provider not configured');

    const jwt = await signTicketJWT({ buyer_email: email, buyer_name: name });
    const base = baseUrl();

    const res = await resend.emails.send({
        from: mailFrom(),
        to: email,
        subject: `Your ${EVENT.name} ticket`,
        template: {
            id: process.env.RESEND_TEMPLATE_TICKET_PURCHASE_CONFIRMATION_ID,
            variables: {
                firstName: name,
                magicLink: `${base}/api/auth/verify?token=${jwt}`,
                pdfLink: `${base}/api/tickets/download?token=${jwt}`,
                tickets: tickets.map((t) => ({
                    code: t.ticket_code,
                    holderName: t.holder_name || name,
                    qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${t.ticket_code}`,
                })),
            },
        },
    });

    if (res.error) throw new Error(JSON.stringify(res.error));
    return res.data?.id;
}
