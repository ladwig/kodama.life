import { redirect } from 'next/navigation';
import { isGroupTicketsEnabled, isSoldOut } from '@/lib/config';
import { EVENT } from '@/lib/event';
import TicketsClient from './TicketsClient';

export default async function TicketsPage() {
    const [groupEnabled, soldOut] = await Promise.all([
        isGroupTicketsEnabled(),
        isSoldOut(),
    ]);
    // ponytail: one fixed price — the Edge Config min_ticket_price knob is
    // bypassed on purpose. Change EVENT.minPrice in lib/event.js.
    const minPrice = EVENT.minPrice;
    // Sold out — no buying, send them back to the home page (which explains it)
    if (soldOut) redirect('/');
    return <TicketsClient minPrice={minPrice} groupEnabled={groupEnabled} />;
}
