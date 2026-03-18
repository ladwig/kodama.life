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
