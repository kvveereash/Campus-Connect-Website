'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowUpRight } from 'lucide-react';
import { resolveReports, type ReportGroup } from '@/lib/actions/reports';
import { REPORT_REASON_LABEL, REPORT_TARGET_NOUN } from '@/lib/report-reasons';
import { formatIST } from '@/lib/format';
import entrance from '@/components/entrance.module.css';
import styles from './reports.module.css';

interface Props {
    initialGroups: ReportGroup[];
}

const keyOf = (g: Pick<ReportGroup, 'targetType' | 'targetId'>) => `${g.targetType}:${g.targetId}`;

export default function ReportsClient({ initialGroups }: Props) {
    const [groups, setGroups] = useState(initialGroups);
    const [busyKey, setBusyKey] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    const resolve = (group: ReportGroup, action: 'REMOVE' | 'DISMISS') => {
        const noun = REPORT_TARGET_NOUN[group.targetType];
        if (action === 'REMOVE' && group.targetType !== 'USER' && group.excerpt) {
            if (!confirm(`Remove this ${noun}? Its owner will be told it broke the guidelines.`)) return;
        }

        const key = keyOf(group);
        setBusyKey(key);
        startTransition(async () => {
            const result = await resolveReports(group.targetType, group.targetId, action);
            setBusyKey(null);
            if (!result.success) {
                toast.error(`That did not save: ${result.error}`);
                return;
            }
            setGroups((current) => current.filter((g) => keyOf(g) !== key));
            if (result.data.note) toast(result.data.note);
            else if (action === 'DISMISS') toast.success('Reports dismissed');
            else toast.success(result.data.removed ? `The ${noun} is removed` : 'Reports closed');
        });
    };

    if (groups.length === 0) {
        return (
            <div className={`${styles.empty} ${entrance.pop}`}>
                <h2 className={styles.emptyTitle}>Nothing reported.</h2>
                <p className={styles.emptyText}>
                    When someone reports a post, comment, event, club or profile, it waits here.
                </p>
                <Link href="/admin" className={styles.emptyLink}>
                    Back to the overview
                </Link>
            </div>
        );
    }

    return (
        <ol className={styles.list}>
            {groups.map((group) => {
                const key = keyOf(group);
                const noun = REPORT_TARGET_NOUN[group.targetType];
                const busy = busyKey === key;
                return (
                    <li key={key} className={styles.item}>
                        <p className={styles.kicker}>
                            <span>{noun}</span>
                            <span aria-hidden="true">·</span>
                            <span className={styles.num}>
                                {group.count} {group.count === 1 ? 'report' : 'reports'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                                First{' '}
                                {formatIST(group.firstReportedAt, {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                })}
                            </span>
                        </p>

                        {group.excerpt ? (
                            <p className={styles.excerpt}>{group.excerpt}</p>
                        ) : (
                            <p className={styles.gone}>
                                This {noun} is already gone. Dismiss to clear the reports.
                            </p>
                        )}
                        {group.ownerName && <p className={styles.owner}>By {group.ownerName}</p>}

                        <ul className={styles.reasons} aria-label="Reasons given">
                            {group.reasons.map((r) => (
                                <li key={r.reason} className={styles.reason}>
                                    {REPORT_REASON_LABEL[r.reason]}
                                    {r.count > 1 && <span className={styles.num}> ×{r.count}</span>}
                                </li>
                            ))}
                        </ul>

                        {group.latestDetails && (
                            <blockquote className={styles.details}>{group.latestDetails}</blockquote>
                        )}

                        <div className={styles.footer}>
                            {group.href && (
                                <Link href={group.href} className={styles.open} target="_blank">
                                    Open the {noun}
                                    <ArrowUpRight size={14} aria-hidden="true" />
                                </Link>
                            )}
                            <div className={styles.actions}>
                                <button
                                    type="button"
                                    className={styles.dismiss}
                                    onClick={() => resolve(group, 'DISMISS')}
                                    disabled={busy}
                                >
                                    Dismiss
                                </button>
                                <button
                                    type="button"
                                    className={styles.remove}
                                    onClick={() => resolve(group, 'REMOVE')}
                                    disabled={busy}
                                >
                                    {group.targetType === 'USER' ? 'Mark handled' : 'Remove'}
                                </button>
                            </div>
                        </div>
                        {group.targetType === 'USER' && (
                            <p className={styles.hint}>
                                Mark handled closes these reports. Anything done to the account itself is manual.
                            </p>
                        )}
                    </li>
                );
            })}
        </ol>
    );
}
