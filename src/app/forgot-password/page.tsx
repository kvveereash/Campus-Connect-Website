'use client';

import { useState } from 'react';
import { requestPasswordReset } from '@/lib/actions/password-reset';
import Link from 'next/link';
import styles from '../login/page.module.css';

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
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Forgot Password</h1>
                    <p className={styles.subtitle}>
                        Enter your email and we'll send you a link to reset your password.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="email" className={styles.label}>
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={styles.input}
                            placeholder="you@example.com"
                            required
                            disabled={isLoading}
                        />
                    </div>

                    {message && (
                        <div
                            className={`${styles.message} ${message.type === 'success' ? styles.success : styles.error
                                }`}
                        >
                            {message.text}
                        </div>
                    )}

                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={isLoading || !email}
                    >
                        {isLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </form>

                <div className={styles.footer}>
                    <Link href="/login" className={styles.link}>
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
