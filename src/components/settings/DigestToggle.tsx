'use client';

import { useEffect, useId, useState, useTransition, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { isDemoEmail } from '@/lib/demo-account';
import { getDigestSettings, setWeeklyDigest } from '@/lib/actions/digest';
import { sendVerificationEmail } from '@/lib/actions/email-verification';
import styles from './DigestToggle.module.css';

/*
 * The weekly digest on and off, in settings. The setting is read in the
 * browser after load, so the settings page itself needs no extra query; the
 * row holds its height meanwhile, so nothing below moves.
 *
 * It can be turned on before the address is confirmed, because that is the
 * moment people decide they want it. It then says plainly that nothing is
 * sent until the address is confirmed, with the button that sends the link.
 */

type Settings = { enabled: boolean; verified: boolean };

export default function DigestToggle({
    className,
    heading,
}: {
    /** Wraps the whole thing, so a section disappears with it when hidden. */
    className?: string;
    heading?: ReactNode;
}) {
    const { user } = useAuth();
    const demo = isDemoEmail(user?.email);
    const [settings, setSettings] = useState<Settings | null>(null);
    // 'hidden' when this account may not have it (signed out, the demo).
    const [problem, setProblem] = useState<'hidden' | 'load' | null>(null);
    const labelId = useId();
    const [saving, startSaving] = useTransition();
    const [sending, startSending] = useTransition();

    useEffect(() => {
        if (demo) return;
        let active = true;
        getDigestSettings({})
            .then((result) => {
                if (!active) return;
                if (result.success) setSettings(result.data);
                else setProblem(result.code === 'UNAUTHORIZED' || result.code === 'FORBIDDEN' ? 'hidden' : 'load');
            })
            .catch(() => {
                if (active) setProblem('load');
            });
        return () => {
            active = false;
        };
    }, [demo]);

    if (demo || problem === 'hidden') return null;

    const toggle = () => {
        if (!settings) return;
        const previous = settings;
        const enabled = !settings.enabled;
        setSettings({ ...settings, enabled });
        startSaving(async () => {
            const result = await setWeeklyDigest(enabled);
            if (result.success) {
                setSettings((s) => (s ? { ...s, enabled: result.data.enabled } : s));
            } else {
                setSettings(previous);
                toast.error(result.error || 'Could not change the Monday email. Try again.');
            }
        });
    };

    const confirmAddress = () => {
        startSending(async () => {
            const result = await sendVerificationEmail();
            if (result.success) toast.success(result.message ?? 'Confirmation link sent. Check your inbox.');
            else toast.error(result.error ?? 'Could not send the link. Try again in a minute.');
        });
    };

    const on = settings?.enabled ?? false;

    return (
        <div className={className}>
            {heading}
            <p className={styles.note}>
                One email on Monday morning with what is on that week: events you are going to, then events at your
                college, colleges you follow, your clubs and topics close to your interests. Weeks with nothing to
                tell you get no email.
            </p>

            {problem === 'load' ? (
                <p className={styles.note} role="alert">
                    Could not load this setting. Reload the page to try again.
                </p>
            ) : (
                <div className={styles.row}>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        aria-labelledby={labelId}
                        className={styles.switch}
                        onClick={toggle}
                        disabled={!settings || saving}
                    >
                        <span className={styles.knob} aria-hidden="true" />
                    </button>
                    <span id={labelId} className={styles.label}>
                        Monday email
                    </span>
                    <span className={styles.state} aria-live="polite">
                        {settings === null ? '' : on ? 'On' : 'Off'}
                    </span>
                </div>
            )}

            {settings && !settings.verified && (
                <div className={styles.unconfirmed}>
                    <p className={styles.note}>
                        {on
                            ? 'Your email address is not confirmed yet, so nothing is sent until it is.'
                            : 'It only goes to a confirmed address, and yours is not confirmed yet.'}
                    </p>
                    <button type="button" className="btn btn-outline" onClick={confirmAddress} disabled={sending}>
                        {sending ? 'Sending' : 'Send a confirmation link'}
                    </button>
                </div>
            )}
        </div>
    );
}
