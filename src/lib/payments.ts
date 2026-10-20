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
): Promise<{ updated: boolean }> {
    /* Conditional, so only an unpaid registration becomes PAID. A replayed
       webhook finds nothing to update instead of rewriting the payment, and a
       CANCELLED registration is not revived by a late event. Database errors
       are deliberately not caught: the webhook has to answer 500 so that
       Stripe retries, rather than 200 and a payment nobody recorded. */
    const { count } = await prisma.eventRegistration.updateMany({
        where: { id: registrationId, status: { in: ['PENDING', 'PENDING_PAYMENT'] } },
        data: {
            status: 'PAID',
            paymentId,
            amountPaid,
        },
    });

    if (count > 0) {
        const registration = await prisma.eventRegistration.findUnique({
            where: { id: registrationId },
            select: { eventId: true },
        });
        revalidatePath('/profile');
        if (registration) revalidatePath(`/events/${registration.eventId}`);
    }

    return { updated: count > 0 };
}
