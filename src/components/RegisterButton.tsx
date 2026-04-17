'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { joinEvent, completePayment } from '@/lib/actions/events';
import { createEventPaymentSession } from '@/lib/actions/payments';
import { verifyPaymentStatus } from '@/lib/actions/verify-payment';
import { toast } from 'sonner';

export default function RegisterButton({ eventId, price = 0 }: { eventId: string, price?: number }) {
    const { user, registerForEvent } = useAuth();
    const router = useRouter();
    const [status, setStatus] = useState<'idle' | 'registering' | 'payment_pending' | 'processing_payment' | 'success'>('idle');
    const [isOpen, setIsOpen] = useState(false);
    const [registrationId, setRegistrationId] = useState<string | null>(null);

    // Check if user is already registered (PAID or COMPLETED)
    const registration = user?.registrations?.find(r => r.eventId === eventId);
    const isRegistered = registration && (registration.status === 'PAID' || registration.status === 'COMPLETED');
    const isPendingPayment = registration && registration.status === 'PENDING_PAYMENT';

    const handleOpenModal = () => {
        if (!user) {
            router.push('/login');
            return;
        }
        setIsOpen(true);
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

                // Close modal after success animation
                setTimeout(() => {
                    setIsOpen(false);
                    setStatus('idle');
                    router.refresh(); // Refresh server data
                }, 2000);
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
            const successUrl = `${window.location.origin}/events/${eventId}?payment=success`;
            const cancelUrl = `${window.location.origin}/events/${eventId}?payment=cancelled`;

            const result = await createEventPaymentSession(
                registrationId,
                successUrl,
                cancelUrl
            );

            if (result.success) {
                // Redirect to Stripe Checkout page
                window.location.href = result.checkoutUrl;
            } else {
                toast.error(result.error || 'Failed to create payment session');
                setStatus('payment_pending');
            }
        } catch (error) {
            toast.error('Payment initiation failed');
            setStatus('payment_pending');
        }
    };

    // Handle verify payment for pending registrations
    const handleVerifyPayment = async () => {
        if (!registration) return;
        setStatus('processing_payment');

        try {
            // Use the paymentId from registration if available, or registration id
            const result = await verifyPaymentStatus(registration.id || registrationId || '');

            if (result.success) {
                registerForEvent(eventId);
                toast.success('Payment verified! You are now registered.');
                router.refresh();
            } else {
                toast.error(result.error || 'Payment not verified');
            }
        } catch (error) {
            toast.error('Failed to verify payment');
        } finally {
            setStatus('idle');
        }
    };

    if (isRegistered) {
        return (
            <button className="btn btn-outline" disabled style={{ background: 'var(--color-mint)', color: 'var(--color-forest)', opacity: 1, border: 'none' }}>
                ✅ Registered
            </button>
        );
    }

    // Show verify payment button for pending payments
    if (isPendingPayment) {
        return (
            <button
                className="btn btn-primary"
                onClick={handleVerifyPayment}
                disabled={status === 'processing_payment'}
            >
                {status === 'processing_payment' ? '⏳ Verifying...' : '🔄 Verify Payment'}
            </button>
        );
    }

    return (
        <>
            <button
                className="btn btn-primary"
                onClick={handleOpenModal}
            >
                {price > 0 ? `Pay $${price} & Register` : 'Register (Free)'}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
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
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            style={{
                                position: 'fixed',
                                top: '50%',
                                left: '50%',
                                x: '-50%',
                                y: '-50%',
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
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring" }}
                                        style={{
                                            fontSize: '4rem',
                                            marginBottom: '1rem',
                                            lineHeight: 1
                                        }}
                                    >
                                        🎉
                                    </motion.div>
                                    <h3 style={{ marginBottom: '0.5rem' }}>You're In!</h3>
                                    <p style={{ color: 'var(--text-secondary)' }}>
                                        Registration successful. Check your email for details.
                                    </p>
                                </div>
                            ) : status === 'payment_pending' || status === 'processing_payment' ? (
                                <div style={{ textAlign: 'center' }}>
                                    <h2 style={{ marginBottom: '1rem' }}>Secure Checkout</h2>
                                    <div style={{ background: 'var(--surface-color)', padding: '1.5rem', borderRadius: '0.75rem', marginBottom: '1.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span>Registration Fee</span>
                                            <span style={{ fontWeight: 700 }}>${price}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                                            <span style={{ fontWeight: 700 }}>Total</span>
                                            <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>${price}</span>
                                        </div>
                                    </div>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleStripeCheckout}
                                        disabled={status === 'processing_payment'}
                                        style={{ width: '100%' }}
                                    >
                                        {status === 'processing_payment' ? 'Redirecting to Stripe...' : '💳 Pay with Stripe'}
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
                                                <motion.span
                                                    animate={{ rotate: 360 }}
                                                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                                    style={{ display: 'inline-block' }}
                                                >
                                                    ↻
                                                </motion.span>
                                            ) : price > 0 ? 'Proceed to Payment' : 'Confirm Free Registration'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
