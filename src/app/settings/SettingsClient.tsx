'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { changePassword, deleteAccount } from '@/lib/actions/account';
import { sendVerificationEmail } from '@/lib/actions/email-verification';
import { isDemoEmail } from '@/lib/demo-account';
import PushToggle from '@/components/PushToggle';
import styles from './page.module.css';

/**
 * Account settings.
 *
 * Two things the site could not do at all: change a password, and delete an
 * account. The second one matters more than it looks — the User table has had
 * a deletedAt column all along, with nothing anywhere able to set it, so
 * "delete my account" was a promise the schema was ready to keep and the
 * interface never offered.
 *
 * Both ask for the current password. Being signed in proves this browser was
 * signed in once; it does not prove who is at the keyboard.
 */
export default function SettingsClient({
    email,
    verified,
}: {
    email: string;
    verified: boolean;
}) {
    const [pending, startTransition] = useTransition();

    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');

    const [armed, setArmed] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');

    const resend = () => {
        startTransition(async () => {
            const result = await sendVerificationEmail();
            if (result.success) toast.success(result.message ?? 'Sent');
            else toast.error(result.error ?? 'Could not send it');
        });
    };

    const submitPassword = (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            const result = await changePassword(current, next);
            if (result.success) {
                toast.success(result.message ?? 'Password changed');
                setCurrent('');
                setNext('');
            } else {
                toast.error(result.error ?? 'Could not change your password');
            }
        });
    };

    const submitDelete = (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            const result = await deleteAccount(confirmPassword);
            if (result.success) {
                // The action has already cleared the session; a full load
                // rather than a soft navigation so nothing client-side is
                // still holding the old user.
                window.location.assign('/');
            } else {
                toast.error(result.error ?? 'Could not delete your account');
            }
        });
    };

    return (
        <div className={styles.page}>
            <p className={styles.label}>Account</p>
            <h1 className={styles.title}>Settings.</h1>

            <section className={styles.section}>
                <p className={styles.sectionLabel}>Signed in as</p>
                <p className={styles.value}>{email}</p>

                {/* Unverified is a state worth surfacing rather than
                    enforcing: password resets go to this address, so an
                    unreachable one only matters on the day you need it. */}
                {verified ? (
                    <p className={styles.note}>Confirmed.</p>
                ) : (
                    <>
                        <p className={styles.note}>
                            Not confirmed yet. Nothing is blocked by that — but a password reset
                            goes to this address, so it is worth knowing it works.
                        </p>
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={resend}
                            disabled={pending}
                        >
                            {pending ? 'Sending' : 'Send a confirmation link'}
                        </button>
                    </>
                )}

                <p className={styles.note} style={{ marginTop: 20 }}>
                    Your name, college and everything else on your profile is edited from{' '}
                    <Link href="/profile">your profile</Link>.
                </p>
            </section>

            <section className={styles.section}>
                <p className={styles.sectionLabel}>Change password</p>
                <form onSubmit={submitPassword} className={styles.form}>
                    <div className={styles.field}>
                        <label className={styles.fieldLabel} htmlFor="current">
                            Current password
                        </label>
                        <input
                            id="current"
                            type="password"
                            autoComplete="current-password"
                            value={current}
                            onChange={(e) => setCurrent(e.target.value)}
                            className={styles.input}
                            required
                        />
                    </div>

                    <div className={styles.field}>
                        <label className={styles.fieldLabel} htmlFor="next">
                            New password
                        </label>
                        <input
                            id="next"
                            type="password"
                            autoComplete="new-password"
                            minLength={8}
                            value={next}
                            onChange={(e) => setNext(e.target.value)}
                            className={styles.input}
                            required
                        />
                        <p className={styles.hint}>At least 8 characters.</p>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={pending || !current || !next}
                    >
                        {pending ? 'Saving' : 'Change password'}
                    </button>
                </form>
            </section>

            {/* Its own section, which PushToggle leaves out entirely when push
                is not set up. The shared demo account cannot subscribe. */}
            {!isDemoEmail(email) && (
                <PushToggle
                    className={styles.section}
                    heading={<p className={styles.sectionLabel}>Notifications</p>}
                />
            )}

            <section className={`${styles.section} ${styles.danger}`}>
                <p className={styles.sectionLabel}>Delete account</p>
                <p className={styles.note}>
                    Your profile is removed and your name comes off everything you posted. Places
                    you took at paid events stay on record, because they are part of a payment —
                    that is the one thing deletion cannot take back. It cannot be undone, and the
                    email address becomes free to sign up with again.
                </p>

                {!armed ? (
                    <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => setArmed(true)}
                    >
                        Delete my account
                    </button>
                ) : (
                    <form onSubmit={submitDelete} className={styles.form}>
                        <div className={styles.field}>
                            <label className={styles.fieldLabel} htmlFor="confirm">
                                Type your password to confirm
                            </label>
                            <input
                                id="confirm"
                                type="password"
                                autoComplete="current-password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={styles.input}
                                required
                            />
                        </div>
                        <div className={styles.row}>
                            <button
                                type="submit"
                                className="btn btn-danger"
                                disabled={pending || !confirmPassword}
                            >
                                {pending ? 'Deleting' : 'Delete permanently'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => {
                                    setArmed(false);
                                    setConfirmPassword('');
                                }}
                                disabled={pending}
                            >
                                Keep my account
                            </button>
                        </div>
                    </form>
                )}
            </section>
        </div>
    );
}
