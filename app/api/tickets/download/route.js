import { NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { getSupabaseAdmin } from '@/lib/supabase';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        let token = searchParams.get('token');

        if (!token) {
            token = req.cookies.get('ticket_token')?.value;
        }

        if (!token) {
            return new NextResponse('Token missing', { status: 401 });
        }

        const payload = await verifyJWT(token);
        if (!payload || !payload.buyer_email) {
            return new NextResponse('Invalid or expired token', { status: 401 });
        }

        const supabase = getSupabaseAdmin();
        
        // Hole alle Tickets für den Käufer (via Order)
        const { data: orders } = await supabase
            .from('orders')
            .select('id')
            .eq('buyer_email', payload.buyer_email)
            .eq('status', 'paid');
            
        if (!orders || orders.length === 0) {
            return new NextResponse('No paid orders found', { status: 404 });
        }
        
        const orderIds = orders.map(o => o.id);
        
        const { data: tickets } = await supabase
            .from('tickets')
            .select('*')
            .in('order_id', orderIds);

        if (!tickets || tickets.length === 0) {
            return new NextResponse('No tickets found', { status: 404 });
        }

        // PDF generieren
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const margin = 50;
        const pageW = 595.28; // A4
        const pageH = 841.89; // A4

        let page = pdfDoc.addPage([pageW, pageH]);
        let cursorY = pageH - margin;

        // Draw Header
        page.drawText('KODAMA', {
            x: margin,
            y: cursorY,
            size: 24,
            font: fontBold,
            color: rgb(0.1, 0.1, 0.1),
        });
        cursorY -= 20;
        page.drawText('22. August 2026 · Kiekebusch See', {
            x: margin,
            y: cursorY,
            size: 12,
            font,
            color: rgb(0.4, 0.4, 0.4),
        });
        cursorY -= 40;

        for (const ticket of tickets) {
            // Check if we need a new page (each ticket takes about 180 points)
            if (cursorY < 200) {
                page = pdfDoc.addPage([pageW, pageH]);
                cursorY = pageH - margin;
            }

            // Lade QR Code
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${ticket.ticket_code}`;
            const qrRes = await fetch(qrUrl);
            const qrBuf = await qrRes.arrayBuffer();
            const qrImage = await pdfDoc.embedPng(qrBuf);

            const qrSize = 120; // nice and compact

            // Kasten (optional, gibt dem Ticket Struktur, wir lassen es sehr clean)
            // page.drawRectangle({ ... })

            page.drawImage(qrImage, {
                x: margin,
                y: cursorY - qrSize,
                width: qrSize,
                height: qrSize,
            });

            const textX = margin + qrSize + 30;

            page.drawText(ticket.holder_name || payload.buyer_name || 'Ticket Holder', {
                x: textX,
                y: cursorY - 40,
                size: 16,
                font: fontBold,
                color: rgb(0.1, 0.1, 0.1),
            });

            page.drawText(`Ticket-Code: ${ticket.ticket_code}`, {
                x: textX,
                y: cursorY - 65,
                size: 13,
                font,
                color: rgb(0.3, 0.3, 0.3),
            });

            cursorY -= (qrSize + 40); // space between tickets
        }

        const pdfBytes = await pdfDoc.save();

        return new NextResponse(pdfBytes, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="kodama-tickets.pdf"',
            },
        });

    } catch (err) {
        console.error('PDF error:', err);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
