// Money path + ticket code self-check: node scripts/check-event.mjs
import assert from 'node:assert/strict';
import { EVENT, grossUpCents, feeCents, ticketCode } from '../lib/event.js';

// Gross-up must leave us with at least the base amount after the processor cut.
for (const base of [1000, 3000, 3050, 12000, 99999]) {
    const gross = grossUpCents(base);
    assert.ok(gross - feeCents(gross) >= base, `gross-up short for ${base}`);
    assert.ok(gross - feeCents(gross) <= base + 2, `gross-up overshoots for ${base}`);
}

// Codes: prefix + 4 chars, no ambiguous glyphs.
for (let i = 0; i < 200; i++) {
    const c = ticketCode();
    assert.match(c, new RegExp(`^${EVENT.ticketPrefix}[A-HJ-NP-Z2-9]{4}$`), `bad code ${c}`);
}

console.log('event checks ok');
