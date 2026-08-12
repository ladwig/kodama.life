import { getMinTicketPrice, isGroupTicketsEnabled } from '@/lib/config';
import TicketsClient from './TicketsClient';

export default async function TicketsPage() {
    const [minPrice, groupEnabled] = await Promise.all([
        getMinTicketPrice(),
        isGroupTicketsEnabled(),
    ]);
    return <TicketsClient minPrice={minPrice} groupEnabled={groupEnabled} />;
}
