import { get } from '@vercel/edge-config';
import { EVENT } from '@/lib/event';

// Live switches, set in Vercel → Storage → Edge Config → your store.
// Every key is optional; anything unset falls back to lib/event.js, so local
// dev works without a connection string.
//
//   min_ticket_price             30       floor price in €
//   price_max                    60       sliding scale up to here in €5 steps;
//                                         set equal to the min for one fixed price
//   group_deal                   "4,3"    4 tickets for the price of 3;
//                                         false → no group deal
//   sold_out                     true     closes checkout, home explains it
//   password_protection_enabled  true     puts the whole site behind SITE_PASSWORD
//                                         (default off — the chef portal keeps
//                                         its own password either way)
//
// Locally, set the same values as EDGE_<KEY> in .env.local (see ENV_OVERRIDES).
//   telegram_notifications       true     per-sale Telegram message (default on)
//   email_notifications          true     per-sale mail to NOTIFY_EMAIL (default off)
//   chef_password                "…"      overrides the CHEF_PASSWORD env var

// There is no local Edge Config emulator, so every key also has an env-var
// twin for local dev: EDGE_<KEY>, e.g. EDGE_GROUP_DEAL="4,3". Listed
// statically because Next inlines process.env at build time in the Edge
// runtime — proxy.ts reads these too, and a dynamic lookup would be undefined.
const ENV_OVERRIDES = {
    min_ticket_price: process.env.EDGE_MIN_TICKET_PRICE,
    price_max: process.env.EDGE_PRICE_MAX,
    group_deal: process.env.EDGE_GROUP_DEAL,
    sold_out: process.env.EDGE_SOLD_OUT,
    password_protection_enabled: process.env.EDGE_PASSWORD_PROTECTION_ENABLED,
    telegram_notifications: process.env.EDGE_TELEGRAM_NOTIFICATIONS,
    email_notifications: process.env.EDGE_EMAIL_NOTIFICATIONS,
    chef_password: process.env.EDGE_CHEF_PASSWORD,
};

/** Edge Config wins; falls back to the EDGE_* env var, then to the caller's default. */
async function read(key) {
    try {
        const value = await get(key);
        if (value !== undefined) return value;
    } catch {
        // Edge Config not connected (local dev) — fall through to the env var
    }
    const raw = ENV_OVERRIDES[key];
    if (raw === undefined || raw === '') return undefined;
    try {
        return JSON.parse(raw); // true / false / 40 / {"size":4,"pay":3}
    } catch {
        return raw;             // plain string, e.g. a password or "4,3"
    }
}

const asNumber = (v) => {
    const n = typeof v === 'string' ? parseInt(v, 10) : v;
    return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Ticket price range in €. `max === min` means a single fixed price;
 * `max > min` means a sliding scale the buyer picks from in €5 steps.
 */
export async function getPricing() {
    const min = asNumber(await read('min_ticket_price')) ?? EVENT.minPrice;
    const max = asNumber(await read('price_max')) ?? asNumber(EVENT.maxPrice);
    return { min, max: max && max > min ? max : min };
}

/**
 * Group deal as { size, pay } — e.g. { size: 4, pay: 3 } for "4 for the price
 * of 3" — or null when off. Accepts "4,3", "4/3", { size, pay }, or a bare
 * `true` (the legacy group_tickets_enabled meaning, 4 for 3).
 */
export async function getGroupDeal() {
    const raw = (await read('group_deal'))
        ?? (await read('group_tickets_enabled'))
        ?? EVENT.groupDeal;
    if (!raw) return null;
    if (raw === true) return { size: 4, pay: 3 };
    const [size, pay] = typeof raw === 'string'
        ? raw.split(/[,/]/).map((n) => parseInt(n.trim(), 10))
        : [raw.size, raw.pay];
    if (!size || !pay || pay >= size) return null; // nonsense config → no deal
    return { size, pay };
}

/** Which per-sale notifications to send. */
export async function getNotifications() {
    const telegram = await read('telegram_notifications');
    const email = await read('email_notifications');
    return {
        telegram: telegram !== false,      // default on
        email: email === true,             // default off
    };
}

export async function isSoldOut() {
    return (await read('sold_out')) === true;
}

/**
 * Site-wide password gate, off unless switched on, so a fresh fork is public.
 * The chef portal is password-protected independently of this.
 */
export async function isPasswordProtectionEnabled() {
    return (await read('password_protection_enabled')) === true;
}

export async function getChefPassword() {
    const value = await read('chef_password');
    return (typeof value === 'string' && value) ? value : (process.env.CHEF_PASSWORD || '');
}
