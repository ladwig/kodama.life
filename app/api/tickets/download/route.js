import { NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { getSupabaseAdmin } from '@/lib/supabase';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import QRCode from 'qrcode';
import { EVENT } from '@/lib/event';

// Builds an SVG path for a ticket shape with wavy left and right edges.
// tx, ty = top-left corner (PDF coords, y-up), tw = width, th = height
function buildTicketPath(tx, ty, tw, th, amp, waveCount) {
    const x0 = tx;
    const x1 = tx + tw;
    const y0 = ty;       // top
    const y1 = ty - th;  // bottom

    const seg = th / waveCount;

    let d = `M ${x0} ${y0} L ${x1} ${y0}`;

    // Right wavy edge: top → bottom (y decreasing)
    for (let i = 0; i < waveCount; i++) {
        const yT = y0 - i * seg;
        const yM = yT - seg * 0.5;
        const yB = yT - seg;
        d += ` C ${x1 + amp} ${yT - seg * 0.15} ${x1 + amp} ${yM + seg * 0.15} ${x1} ${yM}`;
        d += ` C ${x1 - amp} ${yM - seg * 0.15} ${x1 - amp} ${yB + seg * 0.15} ${x1} ${yB}`;
    }

    d += ` L ${x0} ${y1}`;

    // Left wavy edge: bottom → top (y increasing)
    for (let i = 0; i < waveCount; i++) {
        const yB = y1 + i * seg;
        const yM = yB + seg * 0.5;
        const yT = yB + seg;
        d += ` C ${x0 - amp} ${yB + seg * 0.15} ${x0 - amp} ${yM - seg * 0.15} ${x0} ${yM}`;
        d += ` C ${x0 + amp} ${yM + seg * 0.15} ${x0 + amp} ${yT - seg * 0.15} ${x0} ${yT}`;
    }

    d += ' Z';
    return d;
}

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

        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const pageW = 595.28; // A4
        const pageH = 841.89;

        // Ticket dimensions
        const tW = 490;
        const tH = 150;
        const tX = (pageW - tW) / 2;
        const stubW = 105;
        const mainW = tW - stubW;
        const amp = 7;
        const waveCount = 8;

        let page = pdfDoc.addPage([pageW, pageH]);
        let cursorY = pageH - 80;

        for (const ticket of tickets) {
            if (cursorY - tH < 60) {
                page = pdfDoc.addPage([pageW, pageH]);
                cursorY = pageH - 80;
            }

            const tY = cursorY; // top of ticket

            // --- Ticket background (white fill) ---
            const ticketPath = buildTicketPath(tX, tY, tW, tH, amp, waveCount);
            page.drawSvgPath(ticketPath, {
                x: 0,
                y: 0,
                color: rgb(1, 1, 1),
                borderColor: rgb(0.1, 0.1, 0.1),
                borderWidth: 1.5,
            });

            // --- Dashed separator line between main and stub ---
            const sepX = tX + mainW;
            const dashLen = 4;
            const gapLen = 4;
            let dy = tY;
            while (dy > tY - tH) {
                const endY = Math.max(dy - dashLen, tY - tH);
                page.drawLine({
                    start: { x: sepX, y: dy },
                    end: { x: sepX, y: endY },
                    thickness: 0.8,
                    color: rgb(0.5, 0.5, 0.5),
                    dashArray: undefined,
                });
                dy -= dashLen + gapLen;
            }

            // --- Main area content (left side) ---
            const pad = 28;
            const midY = tY - tH / 2;

            // Event name
            page.drawText(EVENT.name.toUpperCase(), {
                x: tX + pad,
                y: midY + 32,
                size: 22,
                font: fontBold,
                color: rgb(0.08, 0.08, 0.08),
            });

            // Holder name
            const holderName = ticket.holder_name || payload.buyer_name || 'Ticket Holder';
            page.drawText(holderName.toUpperCase(), {
                x: tX + pad,
                y: midY + 6,
                size: 11,
                font: fontBold,
                color: rgb(0.3, 0.3, 0.3),
            });

            // Date
            page.drawText('22. AUGUST 2026', {
                x: tX + pad,
                y: midY - 14,
                size: 10,
                font,
                color: rgb(0.45, 0.45, 0.45),
            });

            // --- Stub: QR code + ticket code vertically ---
            const qrSize = 70;
            const stubCenterX = sepX + stubW / 2;
            const qrX = stubCenterX - qrSize / 2;
            const qrY = tY - (tH - qrSize) / 2 - qrSize;

            const qrBuf = await QRCode.toBuffer(ticket.ticket_code, { width: 200, margin: 1 });
            const qrImage = await pdfDoc.embedPng(qrBuf);
            page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });

            const codeWidth = fontBold.widthOfTextAtSize(ticket.ticket_code, 7);
            page.drawText(ticket.ticket_code, {
                x: stubCenterX - codeWidth / 2,
                y: qrY - 12,
                size: 7,
                font: fontBold,
                color: rgb(0.35, 0.35, 0.35),
            });

            cursorY -= tH + 40;
        }

        const pdfBytes = await pdfDoc.save();

        return new NextResponse(pdfBytes, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${EVENT.name}-tickets.pdf"`,
            },
        });

    } catch (err) {
        console.error('PDF error:', err);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
