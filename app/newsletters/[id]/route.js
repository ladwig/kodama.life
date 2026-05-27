import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { FAQ_ITEMS } from '@/lib/faq';

const PAGE_STYLES = `
  body { background-color: #ffffff; margin: 0; padding: 0; }
  .faq-wrap { width: 100%; background: #ffffff; }
  .faq-inner { max-width: 600px; margin: 0 auto; padding: 40px 24px 64px; box-sizing: border-box; }
  .faq-label { font-family: -apple-system, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #bbb; margin: 0 0 20px; }
  .faq-divider { border: none; border-top: 1px solid #ebebeb; margin: 0; }
  .faq-q { font-family: -apple-system, sans-serif; font-size: 14px; font-weight: 600; color: #111; margin: 0; padding: 14px 0 5px; }
  .faq-a { font-family: -apple-system, sans-serif; font-size: 14px; color: #555; line-height: 1.6; margin: 0; padding: 0 0 14px; }
`;

function buildFaqHtml() {
    const items = FAQ_ITEMS.map(item => `
      <hr class="faq-divider" />
      <p class="faq-q">${item.q}</p>
      <p class="faq-a">${item.a}</p>`).join('');

    return `
<style>${PAGE_STYLES}</style>
<div class="faq-wrap">
  <div class="faq-inner">
    <p class="faq-label">FAQ</p>
    ${items}
    <hr class="faq-divider" />
  </div>
</div>`;
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
    const injected = html
        .replace('</head>', '<style>body{margin:0;padding:0;background:#ffffff;}</style></head>')
        .replace('</body>', `${faqHtml}</body>`);

    return new NextResponse(injected, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}
