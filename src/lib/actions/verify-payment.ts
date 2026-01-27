'use server';

import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

/**
 * Verify payment status with Stripe and update registration
 * This is a fallback for when webhooks don't work
 */
export async function verifyPaymentStatus(registrationId: string) {
    const session = await getSession();
    if (!session || !session.userId) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const registration = await prisma.eventRegistration.findUnique({
            where: { id: registrationId },
            include: { event: { select: { title: true } } }
        });

        if (!registration) {
            return { success: false, error: 'Registration not found' };
        }

        if (registration.userId !== session.userId) {
            return { success: false, error: 'Unauthorized' };
        }

        // If already paid, return success
        if (registration.status === 'PAID' || registration.status === 'COMPLETED') {
            return { success: true, message: 'Already paid', isPaid: true };
        }

        // Check if we have a Stripe session ID
        if (!registration.paymentId) {
            return { success: false, error: 'No payment session found' };
        }

        // Try to verify with Stripe
        const { getCheckoutSession } = await import('@/lib/stripe');
        const stripeSession = await getCheckoutSession(registration.paymentId);

        if (!stripeSession) {
            return { success: false, error: 'Could not verify payment' };
        }

        if (stripeSession.payment_status === 'paid') {
            // Update registration to PAID
            await prisma.eventRegistration.update({
                where: { id: registrationId },
                data: {
                    status: 'PAID',
                    amountPaid: (stripeSession.amount_total || 0) / 100
                }
            });

            revalidatePath('/profile');
            revalidatePath(`/events`);

            return {
                success: true,
                message: 'Payment verified!',
                isPaid: true
            };
        } else {
            return {
                success: false,
                error: 'Payment not completed yet',
                paymentStatus: stripeSession.payment_status
            };
        }
    } catch (error) {
        console.error('Payment verification failed:', error);
        return { success: false, error: 'Verification failed' };
    }
}
