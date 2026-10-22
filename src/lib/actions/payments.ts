'use server';

import prisma from '@/lib/db';
import { createCheckoutSession, isStripeConfigured } from '@/lib/stripe';
import { createProtectedAction } from '@/lib/protected-action';
import { z } from 'zod';
import { isOk } from '@/lib/api-response';
import { AuthorizationError } from '@/lib/errors';
import { withIdempotency } from '@/lib/idempotency';

type PaymentSessionResult =
    | { success: true; checkoutUrl: string; sessionId: string }
    | { success: false; error: string };

// ... (imports)

// ─────────────────────────────────────────────────
// Protected Actions
// ─────────────────────────────────────────────────

const createPaymentSessionSchema = z.object({
    registrationId: z.string()
});

/* Where Stripe sends the payer back. Built here, never taken from the client:
   a caller-supplied successUrl turned Checkout into an open redirect. */
function checkoutReturnUrls(eventId: string) {
    const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const page = `${base}/events/${encodeURIComponent(eventId)}`;
    return {
        successUrl: `${page}?payment=success`,
        cancelUrl: `${page}?payment=cancelled`,
    };
}

export const createEventPaymentSessionAction = createProtectedAction(createPaymentSessionSchema, async (data, session) => {
    if (!isStripeConfigured()) {
        throw new Error('Payment system not configured');
    }

    // Ownership is checked before, not inside, the idempotency wrapper. Inside
    // it, a cached result was returned without running the check, so anyone
    // holding a registration id got its owner's checkout session back.
    const registration = await prisma.eventRegistration.findUnique({
        where: { id: data.registrationId },
        include: {
            event: true,
            user: {
                select: { email: true }
            }
        }
    });

    if (!registration) {
        throw new Error('Registration not found');
    }

    if (registration.userId !== session.userId) {
        throw new AuthorizationError('Unauthorized');
    }

    if (registration.status === 'PAID' || registration.status === 'COMPLETED') {
        throw new Error('Already paid');
    }

    // Use idempotency to prevent creating multiple sessions for the same click
    return withIdempotency(
        `create_payment_session:${registration.id}`,
        async () => {
            const { successUrl, cancelUrl } = checkoutReturnUrls(registration.eventId);

            // Create Stripe checkout session
            const checkoutSession = await createCheckoutSession({
                eventId: registration.eventId,
                eventTitle: registration.event.title,
                priceInCents: Math.round(registration.event.price * 100), // Convert to paise
                userEmail: registration.user.email,
                userId: registration.userId,
                registrationId: registration.id,
                successUrl,
                cancelUrl,
            });

            if (!checkoutSession.url) {
                throw new Error('Failed to generate checkout URL');
            }

            // Update registration with payment session ID
            await prisma.eventRegistration.update({
                where: { id: registration.id },
                data: {
                    paymentId: checkoutSession.id,
                    status: 'PENDING_PAYMENT'
                }
            });

            return {
                checkoutUrl: checkoutSession.url,
                sessionId: checkoutSession.id
            };
        },
        3600 // Cache for 1 hour
    );
}, {
    // Audit log? Maybe.
});

// ─────────────────────────────────────────────────
// Legacy Wrapper
// ─────────────────────────────────────────────────

/** @deprecated Use createEventPaymentSessionAction */
export async function createEventPaymentSession(
    registrationId: string
): Promise<PaymentSessionResult> {
    const result = await createEventPaymentSessionAction({ registrationId });
    if (isOk(result)) {
        return { success: true, ...result.data };
    }
    return { success: false, error: result.error };
}

/**
 * Get user's pending payments
 */
const getUserPendingPaymentsSchema = z.object({});

export const getUserPendingPaymentsAction = createProtectedAction(getUserPendingPaymentsSchema, async (_, session) => {
    const pendingRegistrations = await prisma.eventRegistration.findMany({
        where: {
            userId: session.userId,
            status: 'PENDING_PAYMENT'
        },
        include: {
            event: {
                select: {
                    id: true,
                    title: true,
                    price: true,
                    date: true
                }
            }
        }
    });

    return pendingRegistrations;
}, { allowDemo: true });

// Wrapper
export async function getUserPendingPayments() {
    const result = await getUserPendingPaymentsAction({});
    if (isOk(result)) {
        return result.data;
    }
    return [];
}
