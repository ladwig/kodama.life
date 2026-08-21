import { redirect } from 'next/navigation';
import { isGroupTicketsEnabled, isSoldOut } from '@/lib/config';
import TicketsClient from './TicketsClient';

export default async function TicketsPage() {
    const [groupEnabled, soldOut] = await Promise.all([
        isGroupTicketsEnabled(),
        isSoldOut(),
    ]);
    // ponytail: one fixed price now — no sliding scale, so the Edge Config
    // min_ticket_price knob is bypassed. Change the number here.
    const minPrice = 30;
    // Sold out — no buying, send them back to the home page (which explains it)
    if (soldOut) redirect('/');
    return <TicketsClient minPrice={minPrice} groupEnabled={groupEnabled} />;
}
