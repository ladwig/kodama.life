import { redirect } from 'next/navigation';
import { getPricing, getGroupDeal, isSoldOut } from '@/lib/config';
import TicketsClient from './TicketsClient';

export default async function TicketsPage() {
    const [pricing, groupDeal, soldOut] = await Promise.all([
        getPricing(),
        getGroupDeal(),
        isSoldOut(),
    ]);
    // Sold out — no buying, send them back to the home page (which explains it)
    if (soldOut) redirect('/');
    return <TicketsClient pricing={pricing} groupDeal={groupDeal} />;
}
