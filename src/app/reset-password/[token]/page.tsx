'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { verifyResetToken, resetPassword } from '@/lib/actions/password-reset';
import AuthShell, { AuthMessage } from '@/components/auth/AuthShell';
import styles from '@/app/login/auth.module.css';

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

    // Check the link before showing a form it could never submit.
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
            setMessage({ type: 'error', text: 'The two passwords do not match.' });
            return;
        }

        if (password.length < 8) {
            setMessage({ type: 'error', text: 'Use at least 8 characters.' });
            return;
        }

        setIsLoading(true);
        setMessage(null);

        try {
            const result = await resetPassword(token, password);
            if (result.success) {
                setMessage({ type: 'success', text: 'Password changed. Taking you to sign in…' });
                setTimeout(() => router.push('/login'), 2000);
            } else {
                setMessage({ type: 'error', text: result.error || 'Could not reset the password.' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    if (isVerifying) {
        return (
            <AuthShell line="Locked out? It happens to everyone.">
                <p className={styles.label}>Password reset</p>
                <h1 className={styles.title}>Checking your link…</h1>
            </AuthShell>
        );
    }

    if (!tokenValid) {
        return (
            <AuthShell line="Locked out? It happens to everyone.">
                <p className={styles.label}>Password reset</p>
                <h1 className={styles.title}>This link has expired.</h1>
                <p className={styles.subtitle}>
                    {(message?.text || 'Reset links work once and expire after a while').replace(/\.?$/, '.')} Ask
                    for a fresh one and use it straight away.
                </p>
                <p className={styles.foot}>
                    <Link href="/forgot-password">Send a new reset link</Link>
                </p>
            </AuthShell>
        );
    }

    return (
        <AuthShell line="Almost back in.">
            <p className={styles.label}>Password reset</p>
            <h1 className={styles.title}>Choose a new password.</h1>
            <p className={styles.subtitle}>At least 8 characters. You&rsquo;ll sign in with it straight after.</p>

            <form onSubmit={handleSubmit}>
                <div className={styles.fields}>
                    <div className={styles.field}>
                        <label className={styles.fieldLabel} htmlFor="password">
                            New password
                        </label>
                        <input
                            id="password"
                            type="password"
                            autoComplete="new-password"
                            className={styles.input}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={8}
                            disabled={isLoading}
                        />
                    </div>
                    <div className={styles.field}>
                        <label className={styles.fieldLabel} htmlFor="confirmPassword">
                            Confirm password
                        </label>
                        <input
                            id="confirmPassword"
                            type="password"
                            autoComplete="new-password"
                            className={styles.input}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={8}
                            disabled={isLoading}
                        />
                    </div>
                </div>

                {message && <AuthMessage type={message.type}>{message.text}</AuthMessage>}

                <button
                    type="submit"
                    className={styles.submit}
                    disabled={isLoading || !password || !confirmPassword}
                >
                    {isLoading && <Loader2 size={15} className={styles.spin} aria-hidden="true" />}
                    {isLoading ? 'Saving…' : 'Set new password'}
                </button>
            </form>

            <p className={styles.foot}>
                <Link href="/login">Back to sign in</Link>
            </p>
        </AuthShell>
    );
}
