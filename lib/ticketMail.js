import { Resend } from 'resend';
import { signTicketJWT } from '@/lib/jwt';

const resend = (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.endsWith('_...'))
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

export const mailEnabled = () => !!resend;

/**
 * Send (or re-send) the ticket confirmation mail — same Resend template the
 * buyer got at checkout. `tickets` is [{ ticket_code, holder_name }].
 * Throws on failure so callers can report it.
 */
export async function sendTicketMail({ email, name, tickets }) {
    if (!resend) throw new Error('Mail provider not configured');

    const jwt = await signTicketJWT({ buyer_email: email, buyer_name: name });
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://loveatfirstside.quest';

    const res = await resend.emails.send({
        from: `sidequest <${process.env.RESEND_FROM_ADDRESS}>`,
        to: email,
        subject: 'Your sidequest ticket',
        template: {
            id: process.env.RESEND_TEMPLATE_TICKET_PURCHASE_CONFIRMATION_ID,
            variables: {
                firstName: name,
                magicLink: `${baseUrl}/api/auth/verify?token=${jwt}`,
                pdfLink: `${baseUrl}/api/tickets/download?token=${jwt}`,
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
