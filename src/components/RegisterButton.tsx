'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { joinEvent } from '@/lib/actions/events';
import { createEventPaymentSession } from '@/lib/actions/payments';
import { verifyPaymentStatus } from '@/lib/actions/verify-payment';
import { toast } from 'sonner';
import { authHref } from '@/lib/utils';
import entrance from './entrance.module.css';

// Stripe charges in INR (lib/stripe.ts), and every listing shows rupees.
const rupees = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

export default function RegisterButton({ eventId, price = 0 }: { eventId: string, price?: number }) {
    const { user, registerForEvent, isLoading } = useAuth();
    const router = useRouter();
    const [status, setStatus] = useState<'idle' | 'registering' | 'payment_pending' | 'processing_payment' | 'success'>('idle');
    const [isOpen, setIsOpen] = useState(false);
    const [registrationId, setRegistrationId] = useState<string | null>(null);

    // Check if user is already registered (PAID or COMPLETED)
    const registration = user?.registrations?.find(r => r.eventId === eventId);
    const isRegistered = registration && (registration.status === 'PAID' || registration.status === 'COMPLETED');
    const isPendingPayment = registration && registration.status === 'PENDING_PAYMENT';

    const handleOpenModal = () => {
        if (isLoading) return; // Do nothing if still checking session

        if (!user) {
            // Back to this event after signing in (or signing up on the way).
            router.push(authHref(window.location.pathname));
            return;
        }
        setIsOpen(true);
    };

    const showTicket = () => {
        setIsOpen(false);
        setStatus('idle');
        // EventTicket appears once its own fetch returns, which can be just
        // after this click; look for it for up to two seconds.
        let tries = 0;
        const find = () => {
            const ticket = document.getElementById('ticket');
            if (ticket) ticket.scrollIntoView({ behavior: 'smooth', block: 'center' });
            else if (++tries < 20) setTimeout(find, 100);
        };
        find();
    };

    const handleConfirmRegistration = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('registering');

        if (!user) return;

        try {
            const result = await joinEvent(user.id, eventId);

            if (result.success) {
                // If paid event, we need to go to payment step
                if (price > 0 && result.registrationId) {
                    setRegistrationId(result.registrationId);
                    setStatus('payment_pending');
                    return;
                }

                registerForEvent(eventId); // Update local context
                setStatus('success');

                // Show badge notifications
                if (result.earnedBadges && result.earnedBadges.length > 0) {
                    result.earnedBadges.forEach((badge) => {
                        toast.success(`Badge Unlocked: ${badge.name}! ${badge.icon}`, {
                            description: badge.description,
                            duration: 5000,
                        });
                    });
                }

                // The success state stays up until they choose what next: it
                // used to vanish after two seconds, which made the best moment
                // of the visit the shortest.
                router.refresh();
            } else {
                toast.error(result.error || 'Failed to register');
                setStatus('idle');
            }
        } catch (error) {
            console.error('Registration error:', error);
            toast.error('Something went wrong');
            setStatus('idle');
        }
    };

    // Real Stripe Checkout
    const handleStripeCheckout = async () => {
        if (!registrationId) return;
        setStatus('processing_payment');

        try {
            // The server decides where Stripe returns to.
            const result = await createEventPaymentSession(registrationId);

            if (result.success) {
                // Redirect to Stripe Checkout page
                window.location.href = result.checkoutUrl;
            } else {
                toast.error(result.error || 'Failed to create payment session');
                setStatus('payment_pending');
            }
        } catch {
            toast.error('Payment initiation failed');
            setStatus('payment_pending');
        }
    };

    // Handle verify payment for pending registrations
    const handleVerifyPayment = async () => {
        if (!registration) return;
        setStatus('processing_payment');

        try {
            const result = await verifyPaymentStatus(registration.id);

            if (result.success) {
                registerForEvent(eventId);
                toast.success('Payment verified! You are now registered.');
                router.refresh();
            } else {
                toast.error(result.error || 'Payment not verified');
            }
        } catch {
            toast.error('Failed to verify payment');
        } finally {
            setStatus('idle');
        }
    };

    if (isRegistered) {
        return (
            <button className="btn btn-outline" disabled style={{ background: 'var(--color-mint)', color: 'var(--color-forest)', opacity: 1, border: 'none' }}>
                Registered
            </button>
        );
    }

    // A registration waiting on payment: someone who closed Stripe, or paid and
    // came back before the webhook. Offer both ways forward. This used to offer
    // only "Verify payment", so anyone who had not finished paying was stuck:
    // verifying failed and registering again said "Already registered".
    if (isPendingPayment) {
        const resumePayment = async () => {
            setStatus('processing_payment');
            try {
                const result = await createEventPaymentSession(registration.id);
                if (result.success) {
                    window.location.href = result.checkoutUrl;
                    return;
                }
                toast.error(result.error || 'Could not start the payment');
            } catch {
                toast.error('Could not start the payment');
            }
            setStatus('idle');
        };

        return (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                    className="btn btn-primary"
                    onClick={resumePayment}
                    disabled={status === 'processing_payment'}
                >
                    {status === 'processing_payment' ? 'Please wait…' : `Pay ${rupees(price)}`}
                </button>
                <button
                    className="btn btn-outline"
                    onClick={handleVerifyPayment}
                    disabled={status === 'processing_payment'}
                >
                    I have paid
                </button>
            </div>
        );
    }

    return (
        <>
            <button
                className="btn btn-primary"
                onClick={handleOpenModal}
            >
                {price > 0 ? `Pay ${rupees(price)} & Register` : 'Register (Free)'}
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className={entrance.fade}
                        onClick={() => setIsOpen(false)}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.5)',
                            zIndex: 50,
                            backdropFilter: 'blur(4px)'
                        }}
                    />

                    {/* Modal */}
                    <div
                        className={entrance.pop}
                        style={{
                            position: 'fixed',
                            top: '50%',
                            left: '50%',
                            // `translate`, not `transform`, so the pop-in
                            // animation (a transform) composes with the
                            // centring instead of replacing it.
                            translate: '-50% -50%',
                            background: 'var(--background-color)',
                            padding: '2rem',
                            borderRadius: '1rem',
                            zIndex: 51,
                            width: '90%',
                            maxWidth: '400px',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        {status === 'success' ? (
                            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                                <div
                                    className={entrance.pop}
                                    style={{
                                        fontSize: '4rem',
                                        marginBottom: '1rem',
                                        lineHeight: 1
                                    }}
                                >
                                    
                                </div>
                                <h3 style={{ marginBottom: '0.5rem' }}>You&rsquo;re in.</h3>
                                {/* Was "Check your email": no email is sent
                                    until a mail provider is configured. */}
                                <p style={{ color: 'var(--text-secondary)' }}>
                                    Your ticket is on this page, with a QR code to show at the entrance.
                                </p>
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.25rem' }}>
                                    <button type="button" className="btn btn-primary" onClick={showTicket}>
                                        Show my ticket
                                    </button>
                                    <a className="btn btn-outline" href={`/events/${eventId}/calendar.ics`} download>
                                        Add to calendar
                                    </a>
                                </div>
                            </div>
                        ) : status === 'payment_pending' || status === 'processing_payment' ? (
                            <div style={{ textAlign: 'center' }}>
                                <h2 style={{ marginBottom: '1rem' }}>Secure Checkout</h2>
                                <div style={{ background: 'var(--surface-color)', padding: '1.5rem', borderRadius: '0.75rem', marginBottom: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span>Registration Fee</span>
                                        <span style={{ fontWeight: 700 }}>{rupees(price)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                                        <span style={{ fontWeight: 700 }}>Total</span>
                                        <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>{rupees(price)}</span>
                                    </div>
                                </div>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleStripeCheckout}
                                    disabled={status === 'processing_payment'}
                                    style={{ width: '100%' }}
                                >
                                    {status === 'processing_payment' ? 'Redirecting to Stripe...' : 'Pay with Stripe'}
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleConfirmRegistration}>
                                <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Confirm Registration</h2>

                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        value={user?.name || ''}
                                        disabled
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--surface-color)',
                                            color: 'var(--text-primary)'
                                        }}
                                    />
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={user?.email || ''}
                                        disabled
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--surface-color)',
                                            color: 'var(--text-primary)'
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        onClick={() => setIsOpen(false)}
                                        disabled={status === 'registering'}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={status === 'registering'}
                                        style={{ minWidth: '100px' }}
                                    >
                                        {status === 'registering' ? (
                                            <span className={entrance.spin}>↻</span>
                                        ) : price > 0 ? 'Proceed to Payment' : 'Confirm Free Registration'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </>
            )}
        </>
    );
}
