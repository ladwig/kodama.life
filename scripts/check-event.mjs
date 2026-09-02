// Money path + ticket code self-check: node scripts/check-event.mjs
import assert from 'node:assert/strict';
import { EVENT, CODE_LENGTH, grossUpCents, feeCents, ticketCode } from '../lib/event.js';

// Gross-up must leave us with at least the base amount after the processor cut.
for (const base of [1000, 3000, 3050, 12000, 99999]) {
    const gross = grossUpCents(base);
    assert.ok(gross - feeCents(gross) >= base, `gross-up short for ${base}`);
    assert.ok(gross - feeCents(gross) <= base + 2, `gross-up overshoots for ${base}`);
}

// Codes: prefix + CODE_LENGTH chars from the configured alphabet.
const pattern = new RegExp(`^${EVENT.ticketPrefix}[${EVENT.codeChars}]{${CODE_LENGTH}}$`);
for (let i = 0; i < 200; i++) {
    const c = ticketCode();
    assert.match(c, pattern, `bad code ${c}`);
}
assert.ok(EVENT.codeChars.length ** CODE_LENGTH >= 10000, 'code space too small');

console.log('event checks ok');
