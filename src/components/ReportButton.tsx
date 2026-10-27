'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flag } from 'lucide-react';
import type { ReportReason, ReportTarget } from '@prisma/client';
import { useAuth } from '@/context/AuthContext';
import { authHref } from '@/lib/utils';
import { reportContent } from '@/lib/actions/reports';
import { REPORT_DETAILS_MAX, REPORT_REASONS, REPORT_TARGET_NOUN } from '@/lib/report-reasons';
import entrance from '@/components/entrance.module.css';
import styles from './ReportButton.module.css';

interface ReportButtonProps {
    targetType: ReportTarget;
    targetId: string;
    /** Trigger text; "Report" when left out. */
    label?: string;
}

export default function ReportButton({ targetType, targetId, label = 'Report' }: ReportButtonProps) {
    const { user, isInitialized } = useAuth();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [sent, setSent] = useState(false);

    // Before the session is known, a sign-in link would flash for people who are signed in.
    if (!isInitialized) return null;

    if (!user) {
        return (
            <Link href={authHref(pathname)} className={styles.trigger}>
                <Flag size={12} aria-hidden="true" />
                Sign in to report
            </Link>
        );
    }

    return (
        <>
            <button
                type="button"
                className={styles.trigger}
                onClick={() => setOpen(true)}
                disabled={sent}
                aria-haspopup="dialog"
            >
                <Flag size={12} aria-hidden="true" />
                {sent ? 'Reported' : label}
            </button>
            {open && (
                <ReportDialog
                    targetType={targetType}
                    targetId={targetId}
                    onSent={() => setSent(true)}
                    onClose={() => setOpen(false)}
                />
            )}
        </>
    );
}

interface DialogProps {
    targetType: ReportTarget;
    targetId: string;
    onSent: () => void;
    onClose: () => void;
}

function ReportDialog({ targetType, targetId, onSent, onClose }: DialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const doneRef = useRef<HTMLButtonElement>(null);
    const ids = useId();
    const [reason, setReason] = useState<ReportReason | null>(null);
    const [details, setDetails] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);
    const [isPending, startTransition] = useTransition();
    const noun = REPORT_TARGET_NOUN[targetType];

    /* A native modal dialog: it sits in the top layer, so a transformed feed
       card around it cannot trap or clip it, and the browser supplies the
       focus trap, Escape to close and focus back on the trigger afterwards. */
    useEffect(() => {
        const dialog = dialogRef.current;
        if (dialog && !dialog.open) dialog.showModal();
    }, []);

    useEffect(() => {
        if (done) doneRef.current?.focus();
    }, [done]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason) return;
        setError(null);
        startTransition(async () => {
            const result = await reportContent({
                targetType,
                targetId,
                reason,
                details: details.trim() || undefined,
            });
            if (result.success) {
                setDone(true);
                onSent();
            } else {
                setError(result.error || 'The report did not go through. Try again in a moment.');
            }
        });
    };

    return (
        <dialog
            ref={dialogRef}
            className={`${styles.dialog} ${entrance.pop}`}
            aria-labelledby={`${ids}-title`}
            // Lenis would otherwise swallow the wheel when the dialog scrolls on a short screen.
            data-lenis-prevent
            onClose={onClose}
            onClick={(e) => {
                // A click on the dialog box itself (not its contents) is a click on the backdrop.
                if (e.target === e.currentTarget) dialogRef.current?.close();
            }}
        >
            {done ? (
                <div className={styles.body} role="status">
                    <h2 id={`${ids}-title`} className={styles.title}>
                        Thanks. An admin will look at it.
                    </h2>
                    <p className={styles.lede}>
                        Nobody else sees who reported this {noun}.
                    </p>
                    <div className={styles.actions}>
                        <button
                            ref={doneRef}
                            type="button"
                            className={styles.primary}
                            onClick={() => dialogRef.current?.close()}
                        >
                            Close
                        </button>
                    </div>
                </div>
            ) : (
                <form className={styles.body} onSubmit={submit}>
                    <h2 id={`${ids}-title`} className={styles.title}>
                        Report this {noun}
                    </h2>
                    <p className={styles.lede}>An admin reads every report. The author is not told who sent it.</p>

                    <fieldset className={styles.reasons}>
                        <legend className={styles.label}>What is wrong with it</legend>
                        {REPORT_REASONS.map((r, i) => (
                            <label key={r.value} className={styles.reason}>
                                <input
                                    type="radio"
                                    name={`${ids}-reason`}
                                    value={r.value}
                                    checked={reason === r.value}
                                    onChange={() => setReason(r.value)}
                                    // The dialog opened at the reporter's request: focus lands on the first choice.
                                    autoFocus={i === 0}
                                    className={styles.radio}
                                />
                                <span>
                                    <span className={styles.reasonName}>{r.label}</span>
                                    <span className={styles.reasonHint}>{r.hint}</span>
                                </span>
                            </label>
                        ))}
                    </fieldset>

                    <label className={styles.label} htmlFor={`${ids}-details`}>
                        Details <span className={styles.optional}>(optional)</span>
                    </label>
                    <textarea
                        id={`${ids}-details`}
                        className={styles.details}
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                        maxLength={REPORT_DETAILS_MAX}
                        rows={3}
                        placeholder="Anything that helps an admin decide"
                        aria-describedby={`${ids}-count`}
                    />
                    <p id={`${ids}-count`} className={styles.count}>
                        {details.length}/{REPORT_DETAILS_MAX}
                    </p>

                    {error && (
                        <p className={styles.error} role="alert">
                            {error}
                        </p>
                    )}

                    <div className={styles.actions}>
                        <button type="button" className={styles.secondary} onClick={() => dialogRef.current?.close()}>
                            Cancel
                        </button>
                        <button type="submit" className={styles.primary} disabled={!reason || isPending}>
                            {isPending ? 'Sending' : 'Submit'}
                        </button>
                    </div>
                </form>
            )}
        </dialog>
    );
}
