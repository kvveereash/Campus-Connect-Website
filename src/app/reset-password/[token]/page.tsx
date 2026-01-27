'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { verifyResetToken, resetPassword } from '@/lib/actions/password-reset';
import Link from 'next/link';
import styles from '../../login/page.module.css';

export default function ResetPasswordPage() {
    const params = useParams();
    const router = useRouter();
    const token = params.token as string;

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Verify token on mount
    useEffect(() => {
        async function verify() {
            const result = await verifyResetToken(token);
            setTokenValid(result.valid);
            if (!result.valid) {
                setMessage({ type: 'error', text: result.error || 'Invalid link' });
            }
            setIsVerifying(false);
        }
        verify();
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match' });
            return;
        }

        if (password.length < 8) {
            setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
            return;
        }

        setIsLoading(true);
        setMessage(null);

        try {
            const result = await resetPassword(token, password);
            if (result.success) {
                setMessage({ type: 'success', text: 'Password reset successful! Redirecting to login...' });
                setTimeout(() => router.push('/login'), 2000);
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to reset password' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    if (isVerifying) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <p>Verifying reset link...</p>
                </div>
            </div>
        );
    }

    if (!tokenValid) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.header}>
                        <h1 className={styles.title}>Invalid Link</h1>
                        <p className={styles.subtitle}>
                            {message?.text || 'This password reset link is invalid or has expired.'}
                        </p>
                    </div>
                    <div className={styles.footer}>
                        <Link href="/forgot-password" className={styles.link}>
                            Request a new reset link
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Reset Password</h1>
                    <p className={styles.subtitle}>
                        Enter your new password below.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="password" className={styles.label}>
                            New Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={styles.input}
                            placeholder="At least 8 characters"
                            required
                            minLength={8}
                            disabled={isLoading}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="confirmPassword" className={styles.label}>
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={styles.input}
                            placeholder="Confirm your password"
                            required
                            minLength={8}
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
                        disabled={isLoading || !password || !confirmPassword}
                    >
                        {isLoading ? 'Resetting...' : 'Reset Password'}
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
