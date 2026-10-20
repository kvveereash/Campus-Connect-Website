'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { TeamRequest } from '@/types';
import styles from './TeamRequestCard.module.css';
import { formatIST } from '@/lib/format';

interface TeamRequestCardProps {
    request: TeamRequest;
    currentUserId?: string;
    onDelete?: (id: string) => void;
    onEdit?: (request: TeamRequest) => void;
}

export default function TeamRequestCard({
    request,
    currentUserId,
    onDelete,
    onEdit,
}: TeamRequestCardProps) {
    const isOwner = currentUserId === request.creatorId;
    const [connecting, setConnecting] = useState(false);
    const [armed, setArmed] = useState(false);

    const handleConnect = async () => {
        setConnecting(true);
        try {
            const { connectToTeamRequest } = await import('@/lib/actions/team');
            const res = await connectToTeamRequest(request.id);
            // Was confirm() then alert(): two browser dialogs for one action,
            // neither of which the page can style and both of which read as
            // errors. The server is the only thing that can refuse this, so
            // ask it and report what it said.
            if (res.success) {
                toast.success(res.message ?? 'Request sent');
            } else {
                toast.error(res.error ?? 'Could not send that request');
            }
        } finally {
            setConnecting(false);
        }
    };

    return (
        <article className={styles.card}>
            <div className={styles.head}>
                <span className={styles.who}>
                    <span className={styles.avatar} aria-hidden="true">
                        {request.creatorName.charAt(0).toUpperCase()}
                    </span>
                    <span>
                        <span className={styles.userName}>{request.creatorName}</span>
                        <span className={styles.date}>
                            {formatIST(request.createdAt, {
                                day: 'numeric',
                                month: 'short',
                            })}
                        </span>
                    </span>
                </span>
                <span className={styles.badge}>
                    {request.type === 'LOOKING_FOR_TEAM' ? 'Wants a team' : 'Wants a member'}
                </span>
            </div>

            <p className={styles.description}>{request.description}</p>

            {request.skills.length > 0 && (
                <div className={styles.skills}>
                    {request.skills.map((skill) => (
                        <span key={skill} className={styles.skillTag}>
                            {skill}
                        </span>
                    ))}
                </div>
            )}

            <div className={styles.actions}>
                {isOwner ? (
                    <>
                        <span className={styles.yours}>Your post</span>
                        {onEdit && (
                            <button
                                type="button"
                                className={styles.action}
                                onClick={() => onEdit(request)}
                            >
                                Edit
                            </button>
                        )}
                        {onDelete &&
                            (armed ? (
                                <>
                                    <button
                                        type="button"
                                        className={`${styles.action} ${styles.actionArmed}`}
                                        onClick={() => onDelete(request.id)}
                                    >
                                        Confirm delete
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.action}
                                        onClick={() => setArmed(false)}
                                    >
                                        Keep
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    className={styles.action}
                                    onClick={() => setArmed(true)}
                                >
                                    Delete
                                </button>
                            ))}
                    </>
                ) : (
                    <button
                        type="button"
                        className={styles.connect}
                        onClick={handleConnect}
                        disabled={connecting}
                    >
                        {connecting ? 'Sending' : 'Connect'}
                    </button>
                )}
            </div>
        </article>
    );
}
