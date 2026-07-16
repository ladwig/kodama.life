// One-off: re-sign an existing magic link with a 120-day expiry.
// The new token keeps the same jti/price/uses, so the claimed count carries over.
// The OLD url still expires — re-share the new one.
//
// Usage (from the repo root, with env loaded):
//   source .envrc && node scripts/extend-magic-link.mjs "<full magic-ticket URL or token>"
//
// Prints the new URL. Optionally updates the magic_links table if it exists.

import { SignJWT } from 'jose';

const arg = process.argv[2];
if (!arg) {
    console.error('Pass the existing magic-ticket URL or token as an argument.');
    process.exit(1);
}
if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET not set. Run: source .envrc && node scripts/extend-magic-link.mjs "<url>"');
    process.exit(1);
}

const token = arg.includes('/magic-ticket/') ? arg.split('/magic-ticket/')[1].split(/[?#]/)[0].trim() : arg.trim();
const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
if (payload.type !== 'magic_ticket') {
    console.error('That token is not a magic_ticket link. Payload:', payload);
    process.exit(1);
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET);
const newToken = await new SignJWT({ jti: payload.jti, price: payload.price, uses: payload.uses, type: 'magic_ticket' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('120d')
    .sign(secret);

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://loveatfirstside.quest';
console.log('\njti:  ', payload.jti);
console.log('price:', payload.price, '| uses:', payload.uses);
console.log('\nNew 120-day URL:\n' + `${baseUrl}/magic-ticket/${newToken}`);
console.log('\nIf you track links in the DB, update the stored token:');
console.log(`  update magic_links set token = '${newToken}' where jti = '${payload.jti}';`);
