'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { decideApplication, type ClubApplicationView } from '@/lib/actions/recruitment';
import { formatIST } from '@/lib/format';
import styles from './Recruitment.module.css';

interface ApplicationListProps {
    clubId: string;
    recruiting: boolean;
    applications: ClubApplicationView[];
}

const STATUS_LABEL = { PENDING: 'Pending', ACCEPTED: 'Accepted', DECLINED: 'Declined' } as const;

/** Club admins: everyone who applied, waiting ones first, newest first within each. */
export default function ApplicationList({ clubId, recruiting, applications }: ApplicationListProps) {
    const waiting = applications.filter((a) => a.status === 'PENDING').length;

    return (
        <>
            <div className={styles.listHead} id="applications">
                <h3 className={styles.listTitle}>Applications</h3>
                {applications.length > 0 && (
                    <span className={styles.listCount}>
                        {waiting} waiting · {applications.length} in all
                    </span>
                )}
            </div>

            {applications.length === 0 ? (
                <EmptyApplications clubId={clubId} recruiting={recruiting} />
            ) : (
                <ul className={styles.applications}>
                    {applications.map((application) => (
                        <ApplicationItem key={application.id} application={application} />
                    ))}
                </ul>
            )}
        </>
    );
}

function ApplicationItem({ application }: { application: ClubApplicationView }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    // Shown at once on a decision; the refresh that follows brings the
    // new member into the rail and re-sorts the list.
    const [status, setStatus] = useState(application.status);
    const { applicant } = application;
    const firstName = applicant.name.split(' ')[0];

    const decide = (decision: 'ACCEPTED' | 'DECLINED') => {
        startTransition(async () => {
            const result = await decideApplication(application.id, decision);
            if (result.success) {
                setStatus(decision);
                toast.success(
                    decision === 'ACCEPTED'
                        ? `${applicant.name} is now a member. They have been told.`
                        : `Declined. ${applicant.name} has been told.`
                );
                router.refresh();
            } else {
                toast.error(result.error || 'That did not save. Try again in a moment.');
            }
        });
    };

    return (
        <li className={styles.application}>
            <div className={styles.applicant}>
                <span className={styles.avatar} aria-hidden="true">
                    {applicant.name.charAt(0).toUpperCase()}
                </span>
                <div className={styles.who}>
                    <Link href={`/profile/${applicant.id}`} className={styles.name}>
                        {applicant.name}
                    </Link>
                    <p className={styles.sub}>
                        {applicant.college ? `${applicant.college} · ` : ''}
                        Applied{' '}
                        {formatIST(application.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                </div>
                {status !== 'PENDING' && (
                    <span className={`${styles.status} ${status === 'ACCEPTED' ? styles.statusAccepted : ''}`}>
                        {STATUS_LABEL[status]}
                    </span>
                )}
            </div>

            {application.answers.length > 0 && (
                <dl className={styles.answers}>
                    {application.answers.map((item, i) => (
                        <div key={i}>
                            <dt className={styles.answerQuestion}>{item.question}</dt>
                            <dd className={styles.answerText}>{item.answer}</dd>
                        </div>
                    ))}
                </dl>
            )}

            {status === 'PENDING' && (
                <div className={`${styles.buttons} ${styles.decide}`}>
                    <button
                        type="button"
                        className={styles.primary}
                        disabled={pending}
                        aria-label={`Accept ${applicant.name}`}
                        onClick={() => decide('ACCEPTED')}
                    >
                        Accept {firstName}
                    </button>
                    <button
                        type="button"
                        className={styles.secondary}
                        disabled={pending}
                        aria-label={`Decline ${applicant.name}`}
                        onClick={() => decide('DECLINED')}
                    >
                        Decline
                    </button>
                </div>
            )}
        </li>
    );
}

function EmptyApplications({ clubId, recruiting }: { clubId: string; recruiting: boolean }) {
    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(`${window.location.origin}/clubs/${clubId}`);
            toast.success('Link copied. Share it where your college talks.');
        } catch {
            toast.error('Could not copy the link. Copy it from the address bar instead.');
        }
    };

    return (
        <div className={styles.empty}>
            <h4 className={styles.emptyTitle}>No applications yet</h4>
            <p className={styles.emptyText}>
                {recruiting
                    ? 'When a student applies, their answers appear here, newest first.'
                    : 'Open applications above and students can apply from this page.'}
            </p>
            {recruiting ? (
                <button type="button" className={styles.secondary} onClick={copyLink}>
                    Copy the club link
                </button>
            ) : (
                <a href="#recruitment" className={styles.secondary}>
                    Write your questions
                </a>
            )}
        </div>
    );
}
