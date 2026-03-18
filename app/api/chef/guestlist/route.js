import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req) {
    try {
        const { password } = await req.json();

        if (password !== process.env.CHEF_PASSWORD) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();
        const { data: tickets, error } = await supabase
            .from('tickets')
            .select('id, holder_name, ticket_code, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ tickets });
    } catch (err) {
        console.error('Guestlist fetch error:', err);
        return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
    }
}
