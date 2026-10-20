'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { requestPasswordReset } from '@/lib/actions/password-reset';
import AuthShell, { AuthMessage } from '@/components/auth/AuthShell';
import styles from '@/app/login/auth.module.css';

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
                setMessage({ type: 'success', text: result.message || 'Check your email for a reset link.' });
                setEmail('');
            } else {
                setMessage({ type: 'error', text: result.error || 'Something went wrong.' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Could not send the reset email. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthShell line="Locked out? It happens to everyone.">
            <p className={styles.label}>Password reset</p>
            <h1 className={styles.title}>Forgot your password?</h1>
            <p className={styles.subtitle}>
                Enter the email you signed up with and we&rsquo;ll send you a link to choose a new one.
            </p>

            <form onSubmit={handleSubmit}>
                <div className={styles.fields}>
                    <div className={styles.field}>
                        <label className={styles.fieldLabel} htmlFor="email">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            className={styles.input}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@college.edu"
                            required
                            disabled={isLoading}
                        />
                    </div>
                </div>

                {message && <AuthMessage type={message.type}>{message.text}</AuthMessage>}

                <button type="submit" className={styles.submit} disabled={isLoading || !email}>
                    {isLoading && <Loader2 size={15} className={styles.spin} aria-hidden="true" />}
                    {isLoading ? 'Sending…' : 'Send reset link'}
                </button>
            </form>

            <p className={styles.foot}>
                Remembered it? <Link href="/login">Back to sign in</Link>
            </p>
        </AuthShell>
    );
}
