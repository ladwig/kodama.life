import { verifyLinkTokenIgnoreExpiry } from '@/lib/jwt';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isSoldOut } from '@/lib/config';
import MagicTicketClient from './MagicTicketClient';

export default async function MagicTicketPage({ params }) {
    const { token } = await params;

    const payload = await verifyLinkTokenIgnoreExpiry(token);
    if (!payload || payload.type !== 'magic_ticket') {
        return <ErrorState message="This link is no longer valid. We're sold out and there are no sign-ups at the door — please don't make the trip without a guestlist spot." />;
    }

    // Sold out → every outstanding link stops selling, no need to revoke them one by one
    if (await isSoldOut()) {
        return <ErrorState message="We're sold out and there are no sign-ups at the door — please don't make the trip without a guestlist spot." />;
    }

    const supabase = getSupabaseAdmin();

    // Revoked in chef → treat as invalid
    const { data: mlRow } = await supabase
        .from('magic_links')
        .select('revoked')
        .eq('jti', payload.jti)
        .maybeSingle();
    if (mlRow?.revoked) {
        return <ErrorState message="This link is no longer valid. We're sold out and there are no sign-ups at the door — please don't make the trip without a guestlist spot." />;
    }

    const uses = payload.uses || 1;
    const { data: rows } = await supabase
        .from('orders')
        .select('quantity')
        .eq('magic_link_jti', payload.jti);
    const sold = (rows || []).reduce((s, r) => s + (r.quantity || 0), 0);
    const remaining = uses - sold;

    if (remaining <= 0) {
        return <ErrorState message="This link has been fully claimed. We're sold out and there are no sign-ups at the door — please don't make the trip without a guestlist spot." />;
    }

    return <MagicTicketClient minPrice={payload.price} token={token} remaining={remaining} />;
}

function ErrorState({ message }) {
    return (
        <main style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
        }}>
            <p style={{
                fontFamily: "'Funnel Display', sans-serif",
                fontWeight: 700,
                fontSize: '0.9rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                textAlign: 'center',
                maxWidth: '360px',
            }}>
                {message}
            </p>
        </main>
    );
}
