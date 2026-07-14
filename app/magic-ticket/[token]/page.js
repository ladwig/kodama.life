import { verifyJWT } from '@/lib/jwt';
import { getSupabaseAdmin } from '@/lib/supabase';
import MagicTicketClient from './MagicTicketClient';

export default async function MagicTicketPage({ params }) {
    const { token } = await params;

    const payload = await verifyJWT(token);
    if (!payload || payload.type !== 'magic_ticket') {
        return <ErrorState message="This link is invalid or has expired." />;
    }

    const supabase = getSupabaseAdmin();
    const uses = payload.uses || 1;
    const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('magic_link_jti', payload.jti);

    if ((count || 0) >= uses) {
        return <ErrorState message="This ticket link has been fully claimed." />;
    }

    return <MagicTicketClient minPrice={payload.price} token={token} />;
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
