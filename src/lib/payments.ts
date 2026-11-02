import 'server-only';

import type Stripe from 'stripe';
import prisma from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { checkAndAwardBadges } from '@/lib/badges';
import { refundCheckoutPayment } from '@/lib/stripe';
import { lockEvent, seatsTaken } from '@/lib/waitlist';

export type Settlement = 'paid' | 'already-paid' | 'refunded';

type Refund = { kind: 'refund'; reason: 'full' | 'gone' | 'duplicate'; userId: string | null; eventId: string | null; title: string | null };
type Outcome = { kind: 'paid'; userId: string; eventId: string; category: string } | { kind: 'already-paid' } | Refund;

const GONE: Refund = { kind: 'refund', reason: 'gone', userId: null, eventId: null, title: null };

const REFUND_MESSAGES: Record<Refund['reason'], (title: string) => string> = {
    full: (title) => `The last place at ${title} went before your payment came through, so it has been refunded. You are on the waitlist.`,
    gone: (title) => `Your payment for ${title} came through after your place was cancelled, so it has been refunded.`,
    duplicate: (title) => `You paid twice for ${title}. The second payment has been refunded.`,
};

/**
 * Turns a paid Stripe Checkout into a place, or refunds it.
 *
 * Called by the Stripe webhook (signature checked) and by "I have paid",
 * which asks Stripe itself; never with anything a browser sent. It has no
 * auth check of its own, which is why it lives here and not in a 'use
 * server' file, where every export is an endpoint.
 *
 * An unpaid place holds no seat, so the money can arrive for a seat that
 * has gone, or for a place that was cancelled while checkout stayed open.
 * The seat is counted with the event locked, as every other change to
 * seats is; a payment that cannot become a place is refunded at once
 * rather than kept with nothing to show for it.
 *
 * Safe to call again for the same checkout (Stripe retries webhooks): a
 * place already paid by it is left alone, and refunds carry an idempotency
 * key. Database and Stripe errors are not caught, so the webhook answers
 * 500 and Stripe tries again.
 */
export async function settlePaidCheckout(session: Stripe.Checkout.Session): Promise<Settlement> {
    const registrationId = session.metadata?.registrationId;
    if (!registrationId) throw new Error(`Checkout ${session.id} has no registration`);
    const amountPaid = (session.amount_total ?? 0) / 100; // paise to rupees

    const found = await prisma.eventRegistration.findUnique({ where: { id: registrationId }, select: { eventId: true } });

    const outcome: Outcome = found
        ? await prisma.$transaction(async (tx): Promise<Outcome> => {
              await lockEvent(tx, found.eventId);
              // Read again under the lock: a cancel may have just deleted it.
              const registration = await tx.eventRegistration.findUnique({
                  where: { id: registrationId },
                  select: {
                      status: true,
                      paymentId: true,
                      userId: true,
                      event: { select: { capacity: true, title: true, category: true } },
                  },
              });
              if (!registration) return GONE;
              const { userId, event } = registration;
              const refund = (reason: Refund['reason']): Refund => ({ kind: 'refund', reason, userId, eventId: found.eventId, title: event.title });

              if (registration.status === 'PAID' || registration.status === 'COMPLETED' || registration.status === 'CONFIRMED') {
                  return registration.paymentId === session.id ? { kind: 'already-paid' } : refund('duplicate');
              }
              if (registration.status === 'CANCELLED') return refund('gone');

              // PENDING, PENDING_PAYMENT or WAITLISTED: a seat if there is one.
              // Other people's places and holds; this place's own hold is the seat it is paying for.
              if (event.capacity !== null && (await seatsTaken(tx, found.eventId, { except: registrationId })) >= event.capacity) {
                  // Back in line by when they signed up, not at the end.
                  if (registration.status !== 'WAITLISTED') {
                      await tx.eventRegistration.update({ where: { id: registrationId }, data: { status: 'WAITLISTED' } });
                  }
                  return refund('full');
              }

              await tx.eventRegistration.update({
                  where: { id: registrationId },
                  data: { status: 'PAID', paymentId: session.id, amountPaid },
              });
              // The place counts, and can earn badges, only once paid.
              await tx.event.update({ where: { id: found.eventId }, data: { registrationCount: { increment: 1 } } });
              return { kind: 'paid', userId, eventId: found.eventId, category: event.category };
          })
        : GONE;

    if (outcome.kind === 'paid') {
        await checkAndAwardBadges(outcome.userId, outcome.category);
        revalidatePath(`/events/${outcome.eventId}`);
        revalidatePath('/profile');
        return 'paid';
    }
    if (outcome.kind === 'already-paid') return 'already-paid';

    const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
    if (!paymentIntent) throw new Error(`Checkout ${session.id} is paid but has no payment to refund`);
    await refundCheckoutPayment(paymentIntent, session.id);
    console.warn(`Refunded checkout ${session.id} for registration ${registrationId}: ${outcome.reason}`);

    // Telling them is best effort: the refund is what matters, and failing
    // here would only make Stripe retry a refund that has already happened.
    if (outcome.userId && outcome.title) {
        try {
            await prisma.notification.create({
                data: {
                    recipientId: outcome.userId,
                    type: 'EVENT_UPDATE',
                    message: REFUND_MESSAGES[outcome.reason](outcome.title),
                    link: `/events/${outcome.eventId}`,
                },
            });
            if (outcome.eventId) revalidatePath(`/events/${outcome.eventId}`);
        } catch (error) {
            console.error('Could not tell the payer about their refund:', error);
        }
    }
    return 'refunded';
}
