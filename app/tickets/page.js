import { getMinTicketPrice } from '@/lib/config';
import TicketsClient from './TicketsClient';

export default async function TicketsPage() {
    const minPrice = await getMinTicketPrice();
    return <TicketsClient minPrice={minPrice} />;
}
