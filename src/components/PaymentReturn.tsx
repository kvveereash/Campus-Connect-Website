'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { verifyPaymentStatus } from '@/lib/actions/verify-payment';
import { useAuth } from '@/context/AuthContext';
import styles from './PaymentReturn.module.css';

/**
 * What happens when Stripe sends someone back.
 *
 * Checkout was already sending them to `/events/<id>?payment=success` or
 * `?payment=cancelled` — and nothing on the page read that parameter. After
 * paying, you landed on the event page exactly as you had left it, with no
 * confirmation of any kind; the only way to find out whether the money had
 * gone through was to notice a "Verify payment" button and press it yourself.
 *
 * This reads the parameter, states the outcome, and gets the registration
 * confirmed without being asked.
 *
 * On success it still verifies against Stripe rather than trusting the URL.
 * `?payment=success` is just a string in the address bar — anyone can type it,
 * and the webhook may not have landed yet. Stripe is the only thing that knows
 * whether a payment happened, so it is asked.
 */
export default function PaymentReturn({
    eventId,
    registrationId,
}: {
    eventId: string;
    registrationId?: string;
}) {
    const params = useSearchParams();
    const router = useRouter();
    // The registration comes from the session, which loads after first
    // render. Deciding before it arrived meant registrationId was always
    // undefined, so a returning payer was never verified.
    const { isInitialized } = useAuth();
    // Read once, on arrival: the effect below takes it out of the address bar.
    const [outcome] = useState(() => params.get('payment'));
    const handled = useRef(false);
    // The one thing only Stripe can answer; everything else is known already.
    const [verified, setVerified] = useState<'paid' | 'pending' | null>(null);

    const state: 'idle' | 'checking' | 'paid' | 'pending' | 'cancelled' =
        outcome === 'cancelled'
            ? 'cancelled'
            : outcome !== 'success'
              ? 'idle'
              : !isInitialized
                ? 'checking'
                : !registrationId
                  ? 'pending'
                  : (verified ?? 'checking');

    useEffect(() => {
        if (!outcome || handled.current || !isInitialized) return;
        handled.current = true;

        // Take the parameter out of the address bar either way, so a refresh
        // or a shared link does not replay a payment result.
        const clean = () => router.replace(`/events/${eventId}`, { scroll: false });

        if (outcome === 'cancelled') {
            toast('Payment cancelled. Nothing was charged.');
            clean();
            return;
        }

        if (outcome !== 'success') {
            clean();
            return;
        }

        if (!registrationId) {
            clean();
            return;
        }

        verifyPaymentStatus(registrationId)
            .then((result) => {
                if (result.success) {
                    setVerified('paid');
                    toast.success('Payment confirmed. You are registered.');
                    router.refresh();
                } else {
                    // Paid at Stripe but not yet reconciled here. Say so
                    // plainly rather than implying the payment failed.
                    setVerified('pending');
                    toast('Payment received. Confirming your place — this can take a moment.');
                }
            })
            .catch(() => {
                setVerified('pending');
                toast('Payment received. We could not confirm it just yet.');
            })
            .finally(clean);
    }, [outcome, registrationId, eventId, router, isInitialized]);

    if (state === 'idle') return null;

    const copy = {
        checking: {
            label: 'Confirming',
            text: 'Checking your payment with Stripe.',
        },
        paid: {
            label: 'Registered',
            text: 'Payment confirmed. Your place is booked, and your ticket with its QR code is below. It is also under My events.',
        },
        pending: {
            label: 'Payment received',
            text: 'Stripe has your payment. Your registration will confirm shortly — refresh this page if it has not by then.',
        },
        cancelled: {
            label: 'Cancelled',
            text: 'You left the payment before it completed. Nothing was charged, and you can register again whenever you like.',
        },
    }[state];

    return (
        <div
            className={`${styles.notice} ${state === 'cancelled' ? styles.quiet : ''}`}
            role="status"
            aria-live="polite"
        >
            <p className={styles.label}>{copy.label}</p>
            <p className={styles.text}>{copy.text}</p>
        </div>
    );
}
