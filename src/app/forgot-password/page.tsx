'use client';

import { useState } from 'react';
import { requestPasswordReset } from '@/lib/actions/password-reset';
import Link from 'next/link';
import { motion } from 'framer-motion';
import AuthLayout from '@/components/auth/AuthLayout';
import styles from '../login/page.module.css'; // Reuse ticket styles

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        try {
            const result = await requestPasswordReset(email);
            if (result.success) {
                setMessage({ type: 'success', text: result.message || 'Check your email for reset instructions.' });
                setEmail('');
            } else {
                setMessage({ type: 'error', text: result.error || 'Something went wrong.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to send reset email. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Recover Access"
            subtitle="Don't worry, even the best of us lose our ticket."
        >
            <motion.div
                className={styles.ticketWrapper}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* Main Ticket Body */}
                <div className={styles.ticketBody}>
                    <div className={styles.header}>
                        <h2 className={styles.title}>Lost Ticket</h2>
                        <p className={styles.subtitle}>Enter your email to verify your identity</p>
                    </div>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.formGroup}>
                            <label htmlFor="email" className={styles.label}>
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={styles.input}
                                placeholder="student@university.edu"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        {message && (
                            <div
                                style={{
                                    padding: '0.75rem',
                                    borderRadius: '4px',
                                    fontSize: '0.9rem',
                                    fontWeight: 500,
                                    backgroundColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    color: message.type === 'success' ? '#047857' : '#b91c1c',
                                    marginBottom: '1rem',
                                    border: `1px solid ${message.type === 'success' ? '#047857' : '#b91c1c'}`
                                }}
                            >
                                {message.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={isLoading || !email}
                        >
                            {isLoading ? 'Verifying...' : 'SEND RESET LINK'}
                        </button>
                    </form>

                    <div style={{ marginTop: '2rem', fontSize: '0.85rem', fontFamily: 'var(--font-sans)', color: 'var(--text-secondary)' }}>
                        remembered it? <Link href="/login" className={styles.link}>Return to Login</Link>
                    </div>
                </div>

                {/* The Stub (Tears away) */}
                <motion.div
                    className={styles.ticketStub}
                    initial={{ opacity: 0.8 }}
                    animate={isLoading ? { x: 50, rotate: 5, opacity: 0.5 } : { x: 0, rotate: 0, opacity: 1 }}
                >
                    <div className={styles.stubContent}>RESET</div>
                    <div className={styles.barcode} />
                    <div
                        style={{ marginTop: '1rem', fontFamily: 'monospace', fontSize: '0.7rem', color: 'rgba(15, 31, 28, 0.2)' }}
                        suppressHydrationWarning
                    >
                        HEL-P: {new Date().getFullYear()}
                    </div>
                </motion.div>
            </motion.div>
        </AuthLayout>
    );
}
