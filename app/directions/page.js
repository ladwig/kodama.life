import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/jwt';
import DirectionsClient from './DirectionsClient';

export const metadata = {
    title: 'Directions — sidequest',
    robots: { index: false, follow: false },
};

export default async function DirectionsPage() {
    // Already signed in via a ticket magic link? Don't ask for the code again.
    const token = (await cookies()).get('ticket_token')?.value;
    const payload = token ? await verifyJWT(token) : null;

    return <DirectionsClient initialGuest={payload?.buyer_email ? (payload.buyer_name || '') : null} />;
}
