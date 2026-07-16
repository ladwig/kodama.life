// One-off: re-sign existing magic links with a 120-day expiry.
// New tokens keep the same jti/price/uses, so claimed counts carry over.
// The OLD urls still expire — re-share the new ones.
//
// Usage (from repo root, with JWT_SECRET available):
//   vercel env pull .env.local
//   node --env-file=.env.local scripts/extend-magic-link.mjs "<url1>" "<url2>" ...
// or:
//   JWT_SECRET='...' node scripts/extend-magic-link.mjs "<url1>" "<url2>" ...
//
// Prints the new URLs and upsert SQL for the magic_links table.

import { SignJWT } from 'jose';

const args = process.argv.slice(2);
if (args.length === 0) {
    console.error('Pass one or more magic-ticket URLs (or tokens) as arguments.');
    process.exit(1);
}
if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET not set. Run: node --env-file=.env.local scripts/extend-magic-link.mjs "<url>"');
    process.exit(1);
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET);
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://loveatfirstside.quest';

const sqlLines = [];
for (const arg of args) {
    const token = arg.includes('/magic-ticket/') ? arg.split('/magic-ticket/')[1].split(/[?#]/)[0].trim() : arg.trim();
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    if (payload.type !== 'magic_ticket') {
        console.error('Skipping (not a magic_ticket link):', payload);
        continue;
    }
    const newToken = await new SignJWT({ jti: payload.jti, price: payload.price, uses: payload.uses, type: 'magic_ticket' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('120d')
        .sign(secret);

    console.log(`\n${payload.jti}  (€${payload.price}, ${payload.uses} tickets)`);
    console.log(`  ${baseUrl}/magic-ticket/${newToken}`);

    // Upsert: create the row if missing, always refresh the token. Keeps any existing label.
    sqlLines.push(
        `insert into magic_links (jti, label, price, uses, token) values ` +
        `('${payload.jti}', null, ${payload.price}, ${payload.uses}, '${newToken}') ` +
        `on conflict (jti) do update set token = excluded.token;`
    );
}

console.log('\n--- SQL: backfill + store new tokens (run in Supabase) ---\n');
console.log(sqlLines.join('\n'));
