import { redirect } from 'next/navigation';
import { getMinTicketPrice, isGroupTicketsEnabled, isSoldOut } from '@/lib/config';
import TicketsClient from './TicketsClient';

export default async function TicketsPage() {
    const [minPrice, groupEnabled, soldOut] = await Promise.all([
        getMinTicketPrice(),
        isGroupTicketsEnabled(),
        isSoldOut(),
    ]);
    // Sold out — no buying, send them back to the home page (which explains it)
    if (soldOut) redirect('/');
    return <TicketsClient minPrice={minPrice} groupEnabled={groupEnabled} />;
}
