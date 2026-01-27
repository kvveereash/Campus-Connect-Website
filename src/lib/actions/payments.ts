'use server';

import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createCheckoutSession, isStripeConfigured } from '@/lib/stripe';
import { revalidatePath } from 'next/cache';

/**
 * Create a Stripe Checkout session for paid event registration
 * Returns the checkout URL to redirect the user
 */
export async function createEventPaymentSession(
    registrationId: string,
    successUrl: string,
    cancelUrl: string
) {
    const session = await getSession();
    if (!session || !session.userId) {
        return { success: false, error: 'Unauthorized' };
    }

    if (!isStripeConfigured()) {
        return { success: false, error: 'Payment system not configured' };
    }

    try {
        // Get registration with event and user details
        const registration = await prisma.eventRegistration.findUnique({
            where: { id: registrationId },
            include: {
                event: true,
                user: {
                    select: { email: true }
                }
            }
        });

        if (!registration) {
            return { success: false, error: 'Registration not found' };
        }

        if (registration.userId !== session.userId) {
            return { success: false, error: 'Unauthorized' };
        }

        if (registration.status === 'PAID' || registration.status === 'COMPLETED') {
            return { success: false, error: 'Already paid' };
        }

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

        // Update registration with payment session ID
        await prisma.eventRegistration.update({
            where: { id: registrationId },
            data: {
                paymentId: checkoutSession.id,
                status: 'PENDING_PAYMENT'
            }
        });

        return {
            success: true,
            checkoutUrl: checkoutSession.url,
            sessionId: checkoutSession.id
        };
    } catch (error) {
        console.error('Failed to create payment session:', error);
        return { success: false, error: 'Failed to create payment session' };
    }
}

/**
 * Mark a registration as paid (called from webhook)
 */
export async function markRegistrationPaid(
    registrationId: string,
    paymentId: string,
    amountPaid: number
) {
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
export async function getUserPendingPayments() {
    const session = await getSession();
    if (!session || !session.userId) {
        return [];
    }

    try {
        const pendingRegistrations = await prisma.eventRegistration.findMany({
            where: {
                userId: session.userId as string,
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
    } catch (error) {
        console.error('Failed to get pending payments:', error);
        return [];
    }
}
