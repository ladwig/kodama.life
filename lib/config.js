import { get } from '@vercel/edge-config';

// Reads min_ticket_price from Vercel Edge Config.
// Falls back to MIN_TICKET_PRICE env var, then 30.
// Set it in: Vercel dashboard → Storage → Edge Config → your store → min_ticket_price
export async function getMinTicketPrice() {
    try {
        const value = await get('min_ticket_price');
        if (typeof value === 'number' && value > 0) return value;
        if (typeof value === 'string' && parseInt(value, 10) > 0) return parseInt(value, 10);
    } catch {
        // Edge Config not connected (local dev) — use fallback
    }
    return parseInt(process.env.MIN_TICKET_PRICE || '30', 10);
}

// Returns false when password_protection_enabled is explicitly set to false in Edge Config.
// Defaults to true (protected) if the key is missing or Edge Config is unavailable.
export async function isPasswordProtectionEnabled() {
    try {
        const value = await get('password_protection_enabled');
        if (typeof value === 'boolean') return value;
    } catch (e) {
        console.error('[config] Edge Config error (password_protection_enabled):', e.message);
    }
    return true;
}

// Returns false when group_tickets_enabled is explicitly set to false in Edge Config.
// Defaults to true (group deal available) if the key is missing or unavailable.
export async function isGroupTicketsEnabled() {
    try {
        const value = await get('group_tickets_enabled');
        if (typeof value === 'boolean') return value;
    } catch {
        // Edge Config not connected — default to enabled
    }
    return true;
}

// Reads chef_password from Edge Config, falls back to CHEF_PASSWORD env var.
export async function getChefPassword() {
    try {
        const value = await get('chef_password');
        if (typeof value === 'string' && value.length > 0) return value;
    } catch {
        // Edge Config not connected — use env var
    }
    return process.env.CHEF_PASSWORD || '';
}
