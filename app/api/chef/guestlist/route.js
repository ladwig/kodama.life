import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getChefPassword } from '@/lib/config';

export async function POST(req) {
    try {
        const { password } = await req.json();

        if (password !== await getChefPassword()) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // ponytail: local dev without Supabase creds — the chef login validates
        // against this route, so hand back an empty roster instead of a 500
        if (!process.env.SUPABASE_URL) {
            return NextResponse.json({ tickets: [] });
        }

        const supabase = getSupabaseAdmin();
        // Only tickets whose order is still paid — excludes refunded/cancelled from the roster
        const { data: tickets, error } = await supabase
            .from('tickets')
            .select('id, holder_name, ticket_code, checked_in, checked_in_at, created_at, orders!inner(status)')
            .eq('orders.status', 'paid')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ tickets });
    } catch (err) {
        console.error('Guestlist fetch error:', err);
        return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
    }
}
