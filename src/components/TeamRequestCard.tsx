'use client';

import { TeamRequest } from '@/types';
import styles from './TeamRequestCard.module.css';

interface TeamRequestCardProps {
    request: TeamRequest;
    currentUserId?: string;
    onDelete?: (id: string) => void;
    onEdit?: (request: TeamRequest) => void;
    rotation?: number; // Added rotation prop
}

export default function TeamRequestCard({ request, currentUserId, onDelete, onEdit, rotation = 0 }: TeamRequestCardProps) {
    const isOwner = currentUserId === request.creatorId;

    return (
        <div
            className={styles.card}
            style={{ transform: `rotate(${rotation}deg)` } as React.CSSProperties}
        >
            <div className={styles.pin} /> {/* The Push Pin */}
            <div className={styles.header}>
                <div className={styles.userInfo}>
                    <div className={styles.avatar}>
                        {request.creatorName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <span className={styles.userName}>{request.creatorName}</span>
                        <span className={styles.date}>
                            {new Date(request.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>
                <div className={`${styles.badge} ${request.type === 'LOOKING_FOR_TEAM' ? styles.badgeTeam : styles.badgeMember}`}>
                    {request.type === 'LOOKING_FOR_TEAM' ? 'Seeking Team' : 'Seeking Member'}
                </div>
            </div>

            <p className={styles.description}>{request.description}</p>

            <div className={styles.skills}>
                {request.skills.map(skill => (
                    <span key={skill} className={styles.skillTag}>{skill}</span>
                ))}
            </div>

            <div className={styles.actions}>
                <button
                    className={styles.connectBtn}
                    onClick={async () => {
                        if (confirm(`Send a connection request to ${request.creatorName}?`)) {
                            const { connectToTeamRequest } = await import('@/lib/actions/team');
                            const res = await connectToTeamRequest(request.id);
                            if (res.success) {
                                alert(res.message);
                            } else {
                                alert(res.error);
                            }
                        }
                    }}
                    disabled={isOwner}
                >
                    {isOwner ? 'Your Post' : 'Connect'}
                </button>

                {isOwner && (
                    <>
                        {onEdit && (
                            <button
                                className={styles.editBtn}
                                onClick={() => onEdit(request)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    color: 'var(--primary-color)',
                                    fontWeight: 500,
                                    background: 'transparent',
                                    border: '1px solid var(--primary-color)',
                                    borderRadius: '0.5rem',
                                    gap: '0.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    marginLeft: '0.5rem'
                                }}
                            >
                                Edit
                            </button>
                        )}
                        {onDelete && (
                            <button
                                className={styles.deleteBtn}
                                onClick={() => onDelete(request.id)}
                            >
                                Delete
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
