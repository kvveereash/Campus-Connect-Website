'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { joinClub, leaveClub } from '@/lib/actions/clubs';
import { useAuth } from '@/context/AuthContext';
import { usePressAgain } from './usePressAgain';
import styles from './JoinClubButton.module.css';

interface JoinClubButtonProps {
    clubId: string;
    clubName: string;
    isMember: boolean;
    isAdmin: boolean;
    onStatusChange?: () => void;
}

export default function JoinClubButton({ clubId, clubName, isMember, isAdmin, onStatusChange }: JoinClubButtonProps) {
    const { refreshUser } = useAuth();
    const [isPending, startTransition] = useTransition();
    // Leaving asks twice, in place: the first press turns the button into
    // "Press again to leave" for three seconds. window.confirm() used to ask,
    // which reads as a browser error rather than a question from the page.
    const { armed, confirm, disarm } = usePressAgain();

    const handleJoin = () => {
        startTransition(async () => {
            const result = await joinClub(clubId);
            if (result.success) {
                toast.success(`Joined ${clubName}!`);
                await refreshUser(); // Update context
                if (onStatusChange) onStatusChange();
            } else {
                toast.error(result.error || 'Failed to join club');
            }
        });
    };

    const handleLeave = () => {
        if (!confirm()) return;

        startTransition(async () => {
            const result = await leaveClub(clubId);
            if (result.success) {
                toast.success(`Left ${clubName}`);
                await refreshUser(); // Update context
                if (onStatusChange) onStatusChange();
            } else {
                toast.error(result.error || 'Failed to leave club');
            }
        });
    };

    if (isAdmin) {
        return (
            <button className={styles.adminBadge} disabled>
                Admin
            </button>
        );
    }

    if (isMember) {
        return (
            <>
                <button
                    type="button"
                    onClick={handleLeave}
                    onBlur={disarm}
                    className={styles.leaveButton}
                    data-armed={armed}
                    disabled={isPending}
                    aria-busy={isPending}
                >
                    {isPending ? 'Leaving' : armed ? 'Press again to leave' : 'Leave club'}
                </button>
                {/* A focused button's new label is often not read out. */}
                <span className="sr-only" aria-live="polite">
                    {armed ? 'Press again to leave the club.' : ''}
                </span>
            </>
        );
    }

    return (
        <button
            type="button"
            onClick={handleJoin}
            className={styles.joinButton}
            disabled={isPending}
            aria-busy={isPending}
        >
            {isPending ? 'Joining' : 'Join club'}
        </button>
    );
}
