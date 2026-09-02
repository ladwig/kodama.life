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
//   password_protection_enabled  false    opens the site publicly
//   telegram_notifications       true     per-sale Telegram message (default on)
//   email_notifications          true     per-sale mail to NOTIFY_EMAIL (default off)
//   chef_password                "…"      overrides the CHEF_PASSWORD env var

async function read(key) {
    try {
        return await get(key);
    } catch {
        return undefined; // Edge Config not connected (local dev) — use defaults
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
    const min = asNumber(await read('min_ticket_price'))
        ?? asNumber(process.env.MIN_TICKET_PRICE)
        ?? EVENT.minPrice;
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
    const value = await read('sold_out');
    if (typeof value === 'boolean') return value;
    return process.env.SOLD_OUT === 'true';
}

/** Defaults to protected when the key is missing or Edge Config is down. */
export async function isPasswordProtectionEnabled() {
    const value = await read('password_protection_enabled');
    return typeof value === 'boolean' ? value : true;
}

export async function getChefPassword() {
    const value = await read('chef_password');
    return (typeof value === 'string' && value) ? value : (process.env.CHEF_PASSWORD || '');
}
