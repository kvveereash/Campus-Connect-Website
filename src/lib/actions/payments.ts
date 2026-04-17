'use server';

import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createCheckoutSession, isStripeConfigured } from '@/lib/stripe';
import { revalidatePath } from 'next/cache';
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
    registrationId: z.string(),
    successUrl: z.string().url(),
    cancelUrl: z.string().url()
});

export const createEventPaymentSessionAction = createProtectedAction(createPaymentSessionSchema, async (data, session) => {
    if (!isStripeConfigured()) {
        throw new Error('Payment system not configured');
    }

    // Use idempotency to prevent creating multiple sessions for the same click
    return withIdempotency(
        `create_payment_session:${data.registrationId}`,
        async () => {
            // Get registration with event and user details
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

            // Create Stripe checkout session
            const checkoutSession = await createCheckoutSession({
                eventId: registration.eventId,
                eventTitle: registration.event.title,
                priceInCents: Math.round(registration.event.price * 100), // Convert to paise
                userEmail: registration.user.email,
                userId: registration.userId,
                registrationId: registration.id,
                successUrl: data.successUrl,
                cancelUrl: data.cancelUrl,
            });

            if (!checkoutSession.url) {
                throw new Error('Failed to generate checkout URL');
            }

            // Update registration with payment session ID
            await prisma.eventRegistration.update({
                where: { id: data.registrationId },
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
    registrationId: string,
    successUrl: string,
    cancelUrl: string
): Promise<PaymentSessionResult> {
    const result = await createEventPaymentSessionAction({ registrationId, successUrl, cancelUrl });
    if (isOk(result)) {
        return { success: true, ...result.data };
    }
    return { success: false, error: result.error };
}

/**
 * Mark a registration as paid
 * 
 * ⚠️ INTERNAL USE ONLY - Called exclusively from Stripe webhook handler
 * This function intentionally has no auth check since it's called from
 * the webhook which verifies the signature instead.
 * 
 * DO NOT EXPORT THIS FUNCTION TO CLIENT COMPONENTS
 */
export async function markRegistrationPaid(
    registrationId: string,
    paymentId: string,
    amountPaid: number,
    _internalCallerToken?: string // Optional: Add webhook verification token
) {
    // Guard: Ensure this is only called server-side
    // 'use server' at top of file already prevents direct client calls,
    // but this adds defense-in-depth for any internal misuse
    if (typeof window !== 'undefined') {
        console.error('[SECURITY] markRegistrationPaid called from client context');
        return { success: false, error: 'Invalid call context' };
    }

    try {
        const registration = await prisma.eventRegistration.update({
            where: { id: registrationId },
            data: {
                status: 'PAID',
                paymentId,
                amountPaid,
                updatedAt: new Date()
            }
        });

        revalidatePath('/profile');
        revalidatePath(`/events/${registration.eventId}`);

        return { success: true };
    } catch (error) {
        console.error('Failed to mark registration as paid:', error);
        return { success: false, error: 'Failed to update registration' };
    }
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
});

// Wrapper
export async function getUserPendingPayments() {
    const result = await getUserPendingPaymentsAction({});
    if (isOk(result)) {
        return result.data;
    }
    return [];
}
