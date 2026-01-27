import Stripe from 'stripe';

/**
 * Stripe SDK configuration
 * Uses server-side secret key for secure API calls
 */

// Initialize Stripe with API key
// In development, we'll use a placeholder if not set
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey && process.env.NODE_ENV === 'production') {
    throw new Error('STRIPE_SECRET_KEY is required in production');
}

export const stripe = stripeSecretKey
    ? new Stripe(stripeSecretKey, {
        apiVersion: '2024-12-18.acacia',
        typescript: true,
    })
    : null;

/**
 * Check if Stripe is properly configured
 */
export function isStripeConfigured(): boolean {
    return !!stripe;
}

/**
 * Create a Stripe Checkout Session for event registration
 */
export async function createCheckoutSession({
    eventId,
    eventTitle,
    priceInCents,
    userEmail,
    userId,
    registrationId,
    successUrl,
    cancelUrl,
}: {
    eventId: string;
    eventTitle: string;
    priceInCents: number;
    userEmail: string;
    userId: string;
    registrationId: string;
    successUrl: string;
    cancelUrl: string;
}) {
    if (!stripe) {
        throw new Error('Stripe is not configured');
    }

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
            {
                price_data: {
                    currency: 'inr', // Indian Rupees for campus events
                    product_data: {
                        name: eventTitle,
                        description: `Registration for ${eventTitle}`,
                    },
                    unit_amount: priceInCents, // Amount in paise (INR cents)
                },
                quantity: 1,
            },
        ],
        mode: 'payment',
        customer_email: userEmail,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
            eventId,
            userId,
            registrationId,
            type: 'event_registration',
        },
    });

    return session;
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    webhookSecret: string
): Stripe.Event | null {
    if (!stripe) return null;

    try {
        return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return null;
    }
}

/**
 * Get checkout session by ID
 */
export async function getCheckoutSession(sessionId: string) {
    if (!stripe) return null;
    return stripe.checkout.sessions.retrieve(sessionId);
}
