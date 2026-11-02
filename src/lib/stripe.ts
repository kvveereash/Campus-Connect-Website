import Stripe from 'stripe';

/**
 * Stripe SDK configuration
 * Uses server-side secret key for secure API calls
 */

// Lazy Stripe initialization to avoid errors during build
let _stripe: Stripe | null = null;

function getStripeInstance(): Stripe | null {
    if (_stripe) return _stripe;

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
        if (process.env.NODE_ENV === 'production') {
            console.error('STRIPE_SECRET_KEY is not set');
        }
        return null;
    }

    _stripe = new Stripe(stripeSecretKey, {
        // Pinned to the version the webhook endpoint was created with; the SDK's
        // types only list its own latest version, hence the cast to its type.
        apiVersion: '2024-12-18.acacia' as Stripe.StripeConfig['apiVersion'],
        typescript: true,
    });

    return _stripe;
}

export const stripe = typeof window === 'undefined' ? getStripeInstance() : null;

/**
 * Check if Stripe is properly configured
 */
export function isStripeConfigured(): boolean {
    return !!stripe;
}

/** How long a checkout link can be paid. */
export const CHECKOUT_MINUTES = 31;

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
        // An unpaid place holds no seat, so a checkout left open for the
        // default 24 hours could be paid long after the seats have gone.
        // 30 minutes is the shortest Stripe allows; a minute over for clock
        // drift.
        expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_MINUTES * 60,
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

/**
 * Closes a checkout so it can no longer be paid. Says how it ended:
 * 'closed' (it was open, now it isn't), 'paid' (too late: the payer
 * finished), or 'gone' (already expired, or never existed here).
 */
export async function closeCheckout(sessionId: string): Promise<'closed' | 'paid' | 'gone'> {
    if (!stripe) return 'gone';
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.status === 'complete') return 'paid';
    if (session.status !== 'open') return 'gone';
    try {
        await stripe.checkout.sessions.expire(sessionId);
        return 'closed';
    } catch (error) {
        // It finished between the two calls.
        const again = await stripe.checkout.sessions.retrieve(sessionId);
        if (again.status === 'complete') return 'paid';
        throw error;
    }
}

/**
 * Refunds a checkout's payment in full. The idempotency key makes a retried
 * webhook refund once; after Stripe forgets the key (24 hours), a second
 * attempt fails as already refunded, which is the outcome wanted.
 */
export async function refundCheckoutPayment(paymentIntentId: string, sessionId: string) {
    if (!stripe) throw new Error('Stripe is not configured');
    try {
        await stripe.refunds.create({ payment_intent: paymentIntentId }, { idempotencyKey: `refund:${sessionId}` });
    } catch (error) {
        if ((error as { code?: string }).code === 'charge_already_refunded') return;
        throw error;
    }
}
