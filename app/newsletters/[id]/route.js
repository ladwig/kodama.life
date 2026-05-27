import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { FAQ_ITEMS } from '@/lib/faq';

function buildFaqHtml() {
    const items = FAQ_ITEMS.map(item => `
    <tr>
      <td style="padding:0 0 0 0;">
        <p style="margin:0;padding:12px 0 4px;font-family:sans-serif;font-size:15px;font-weight:600;color:#111;">${item.q}</p>
        <p style="margin:0;padding:0 0 12px;font-family:sans-serif;font-size:14px;color:#444;line-height:1.55;">${item.a}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:0;" />
      </td>
    </tr>`).join('');

    return `
<table border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;margin:0 auto;padding:32px 24px 48px;">
  <tr>
    <td>
      <p style="font-family:sans-serif;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#999;margin:0 0 16px;">FAQ</p>
      <hr style="border:none;border-top:1px solid #eee;margin:0 0 0;" />
    </td>
  </tr>
  ${items}
</table>`;
}

export async function GET(req, { params }) {
    const { id } = await params;

    // Only allow simple alphanumeric IDs to prevent path traversal
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
        return new NextResponse('Not found', { status: 404 });
    }

    const filePath = path.join(process.cwd(), 'public', 'newsletters', `${id}.html`);

    let html;
    try {
        html = await readFile(filePath, 'utf8');
    } catch {
        return new NextResponse('Not found', { status: 404 });
    }

    const faqHtml = buildFaqHtml();
    const injected = html.replace('</body>', `${faqHtml}</body>`);

    return new NextResponse(injected, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}
