import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
    try {
        const { email, name } = await req.json();

        if (!email || !name) {
            return NextResponse.json({ error: 'E-Mail und Name sind Pflichtfelder.' }, { status: 400 });
        }
        if (!email.includes('@')) {
            return NextResponse.json({ error: 'Ungültige E-Mail-Adresse.' }, { status: 400 });
        }

        const segmentId = process.env.RESEND_SEGMENT_SUBSCRIBERS_ID;

        // 1. Contact anlegen / aktualisieren (idempotent)
        await resend.contacts.create({
            email: email.toLowerCase().trim(),
            firstName: name.trim(),   // voller Name → in Mails als {{firstName}}
            unsubscribed: false,
        });

        // 2. In "Subscribers" Segment eintragen
        if (segmentId) {
            await resend.contacts.segments.add({
                email: email.toLowerCase().trim(),
                segmentId,
            });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Newsletter subscribe error:', err);
        return NextResponse.json({ error: 'Fehler beim Anmelden.' }, { status: 500 });
    }
}
