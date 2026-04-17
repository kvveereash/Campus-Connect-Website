'use server';

import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

/**
 * Verify payment status with Stripe and update registration
 * This is a fallback for when webhooks don't work
 */
import { createProtectedAction } from '@/lib/protected-action';
import { z } from 'zod';
import { isOk } from '@/lib/api-response';
import { AuthorizationError } from '@/lib/errors';

// ─────────────────────────────────────────────────
// Protected Actions
// ─────────────────────────────────────────────────

export const verifyPaymentStatusAction = createProtectedAction(z.object({ registrationId: z.string() }), async (data, session) => {
    const registration = await prisma.eventRegistration.findUnique({
        where: { id: data.registrationId },
        include: { event: { select: { title: true } } }
    });

    if (!registration) {
        throw new Error('Registration not found');
    }

    if (registration.userId !== session.userId) {
        throw new AuthorizationError('Unauthorized');
    }

    // If already paid, return success
    if (registration.status === 'PAID' || registration.status === 'COMPLETED') {
        return { message: 'Already paid', isPaid: true };
    }

    // Check if we have a Stripe session ID
    if (!registration.paymentId) {
        throw new Error('No payment session found');
    }

    // Try to verify with Stripe
    const { getCheckoutSession } = await import('@/lib/stripe');
    const stripeSession = await getCheckoutSession(registration.paymentId);

    if (!stripeSession) {
        throw new Error('Could not verify payment');
    }

    if (stripeSession.payment_status === 'paid') {
        // Update registration to PAID
        await prisma.eventRegistration.update({
            where: { id: data.registrationId },
            data: {
                status: 'PAID',
                amountPaid: (stripeSession.amount_total || 0) / 100
            }
        });

        revalidatePath('/profile');
        revalidatePath(`/events`);

        return {
            message: 'Payment verified!',
            isPaid: true
        };
    } else {
        // Return structured data about pending status
        // ApiResult success=true, but data indicates not paid yet? 
        // Or fail?
        // Legacy returned success=false. 
        // But "Payment not completed yet" isn't an infrastructure error.
        // I'll throw an error or return fail.
        // Actually, returning fail with code 'PAYMENT_PENDING' might be better if I had that code.
        // For now, I'll return fail.
        throw new Error(`Payment not completed yet (Status: ${stripeSession.payment_status})`);
    }
}, {
    audit: { action: 'PAYMENT', entityType: 'Payment', getEntityId: (d) => d.registrationId }
});

// ─────────────────────────────────────────────────
// Legacy Wrapper
// ─────────────────────────────────────────────────

export async function verifyPaymentStatus(registrationId: string): Promise<
    | { success: true; message: string; isPaid: true }
    | { success: false; error: string }
> {
    const result = await verifyPaymentStatusAction({ registrationId });
    if (isOk(result)) {
        return { success: true, message: result.data.message, isPaid: true };
    }
    return { success: false, error: result.error };
}
