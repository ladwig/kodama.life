import { SignJWT, jwtVerify } from 'jose';

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET);

/**
 * Sign a ticket JWT (valid 90 days).
 * Payload: { buyer_email, buyer_name }
 */
export async function signTicketJWT(payload) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('90d')
        .sign(await secret());
}

/**
 * Sign an unsubscribe JWT (valid 30 days).
 * Payload: { email, type: 'unsubscribe' }
 */
export async function signUnsubscribeJWT(email) {
    return new SignJWT({ email, type: 'unsubscribe' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(await secret());
}

/**
 * Sign a magic ticket link JWT (valid 14 days).
 * Payload: { jti, price, uses, type: 'magic_ticket' }
 * uses = how many tickets this link can sell (default 1).
 */
export async function signMagicLinkJWT({ jti, price, uses = 1 }) {
    return new SignJWT({ jti, price, uses, type: 'magic_ticket' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('14d')
        .sign(await secret());
}

/**
 * Sign a guestlist link JWT (valid 90 days — managed over time until the event).
 * Payload: { jti, uses, label, type: 'guestlist' }
 * uses = how many free tickets this list can issue.
 */
export async function signGuestlistJWT({ jti, uses, label }) {
    return new SignJWT({ jti, uses, label, type: 'guestlist' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('90d')
        .sign(await secret());
}

/**
 * Verify any JWT. Returns the decoded payload or null on failure.
 */
export async function verifyJWT(token) {
    try {
        const { payload } = await jwtVerify(token, await secret());
        return payload;
    } catch {
        return null;
    }
}
