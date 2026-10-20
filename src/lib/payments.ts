import 'server-only';

import prisma from '@/lib/db';
import { revalidatePath } from 'next/cache';

/**
 * Mark a registration as paid.
 *
 * Called only from the Stripe webhook, which has verified the signature. It
 * has no auth check of its own, which is why it lives here and not in
 * lib/actions/payments.ts: every export of a 'use server' file is an endpoint
 * the browser can call, so it used to be callable by anyone with a
 * registration id. server-only makes importing it from client code a build
 * error.
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
