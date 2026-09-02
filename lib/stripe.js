import Stripe from 'stripe';

let client;

// Lazy — so the app builds and runs locally without STRIPE_SECRET_KEY set.
export function getStripe() {
    client ??= new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
    return client;
}
