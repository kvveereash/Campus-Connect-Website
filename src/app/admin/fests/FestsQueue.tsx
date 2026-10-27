'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowUpRight } from 'lucide-react';
import { decideFest, type PendingFest } from '@/lib/actions/fests';
import { festDateRange } from '@/app/fests/rules';
import { formatIST } from '@/lib/format';
import entrance from '@/components/entrance.module.css';
import styles from './fests.module.css';

const excerpt = (text: string) => (text.length > 280 ? `${text.slice(0, 277)}…` : text);

export default function FestsQueue({ initialFests }: { initialFests: PendingFest[] }) {
    const [fests, setFests] = useState(initialFests);
    const [busyId, setBusyId] = useState<string | null>(null);
    // The fest whose reject reason box is open, and what has been typed in it.
    const [rejecting, setRejecting] = useState<{ id: string; reason: string } | null>(null);

    const decide = async (fest: PendingFest, approve: boolean, reason?: string) => {
        setBusyId(fest.id);
        const result = await decideFest(fest.id, approve, reason?.trim() || undefined);
        setBusyId(null);
        if (!result.success) {
            toast.error(`That did not save: ${result.error}`);
            return;
        }
        setRejecting(null);
        setFests((current) => current.filter((f) => f.id !== fest.id));
        toast.success(approve ? `${fest.name} is on the board` : `${fest.name} is rejected and taken down`);
    };

    if (fests.length === 0) {
        return (
            <div className={`${styles.empty} ${entrance.pop}`}>
                <h2 className={styles.emptyTitle}>No fests waiting.</h2>
                <p className={styles.emptyText}>When a club admin starts a fest, it waits here for approval.</p>
                <Link href="/admin" className={styles.emptyLink}>
                    Back to the overview
                </Link>
            </div>
        );
    }

    return (
        <ol className={styles.list}>
            {fests.map((fest) => {
                const busy = busyId === fest.id;
                const open = rejecting?.id === fest.id;
                return (
                    <li key={fest.id} className={styles.item}>
                        <p className={styles.kicker}>
                            <span className={styles.num}>{festDateRange(fest.startDate, fest.endDate)}</span>
                            <span aria-hidden="true">·</span>
                            <span className={styles.num}>
                                {fest.eventCount} {fest.eventCount === 1 ? 'event' : 'events'} attached
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                                Sent{' '}
                                {formatIST(fest.createdAt, {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                })}
                            </span>
                        </p>

                        <h2 className={styles.name}>{fest.name}</h2>
                        {fest.tagline && <p className={styles.tagline}>{fest.tagline}</p>}
                        <p className={styles.description}>{excerpt(fest.description)}</p>
                        <p className={styles.owner}>
                            {fest.club ? `${fest.club}, ${fest.college}` : fest.college}
                            {fest.creator ? ` · started by ${fest.creator}` : ''}
                        </p>

                        {open && (
                            <div className={styles.reasonBox}>
                                <label className={styles.reasonLabel} htmlFor={`reason-${fest.id}`}>
                                    Why not? The organiser sees this.
                                </label>
                                <textarea
                                    id={`reason-${fest.id}`}
                                    className={styles.reason}
                                    value={rejecting.reason}
                                    maxLength={500}
                                    rows={3}
                                    onChange={(e) => setRejecting({ id: fest.id, reason: e.target.value })}
                                    placeholder="e.g. The dates clash with the college calendar. Check them and start it again."
                                />
                            </div>
                        )}

                        <div className={styles.footer}>
                            <Link href={`/fests/${fest.id}/edit`} className={styles.open} target="_blank">
                                Open the fest
                                <ArrowUpRight size={14} aria-hidden="true" />
                            </Link>
                            <div className={styles.actions}>
                                {open ? (
                                    <>
                                        <button
                                            type="button"
                                            className={styles.secondary}
                                            onClick={() => setRejecting(null)}
                                            disabled={busy}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.reject}
                                            onClick={() => decide(fest, false, rejecting.reason)}
                                            disabled={busy}
                                        >
                                            Reject and tell them
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            className={styles.secondary}
                                            onClick={() => setRejecting({ id: fest.id, reason: '' })}
                                            disabled={busy}
                                        >
                                            Reject
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.approve}
                                            onClick={() => decide(fest, true)}
                                            disabled={busy}
                                        >
                                            Approve
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}
