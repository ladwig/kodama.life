import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req) {
    try {
        const { code } = await req.json();
        const ticketCode = String(code || '').trim().toUpperCase();
        if (!ticketCode) {
            return NextResponse.json({ error: 'Enter your ticket code.' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        const { data: ticket, error } = await supabase
            .from('tickets')
            .select('holder_name, orders!inner(status)')
            .eq('ticket_code', ticketCode)
            .eq('orders.status', 'paid')
            .maybeSingle();

        if (error) throw error;
        if (!ticket) {
            return NextResponse.json({ error: 'We could not find that ticket code.' }, { status: 404 });
        }

        return NextResponse.json({ ok: true, name: ticket.holder_name });
    } catch (err) {
        console.error('Directions lookup error:', err);
        return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 });
    }
}
