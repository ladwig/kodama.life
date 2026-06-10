import { get } from '@vercel/edge-config';

// Reads min_ticket_price from Vercel Edge Config.
// Falls back to MIN_TICKET_PRICE env var, then 30.
// Set it in: Vercel dashboard → Storage → Edge Config → your store → min_ticket_price
export async function getMinTicketPrice() {
    try {
        const value = await get('min_ticket_price');
        if (typeof value === 'number' && value > 0) return value;
        if (typeof value === 'string' && parseInt(value, 10) > 0) return parseInt(value, 10);
    } catch {
        // Edge Config not connected (local dev) — use fallback
    }
    return parseInt(process.env.MIN_TICKET_PRICE || '30', 10);
}
