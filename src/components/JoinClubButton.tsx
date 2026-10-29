'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { joinClub, leaveClub } from '@/lib/actions/clubs';
import { useAuth } from '@/context/AuthContext';
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
    const [armed, setArmed] = useState(false);
    useEffect(() => {
        if (!armed) return;
        const id = setTimeout(() => setArmed(false), 3000);
        return () => clearTimeout(id);
    }, [armed]);

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
        if (!armed) {
            setArmed(true);
            return;
        }
        setArmed(false);

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
            <button
                type="button"
                onClick={handleLeave}
                onBlur={() => setArmed(false)}
                className={styles.leaveButton}
                data-armed={armed}
                disabled={isPending}
                aria-busy={isPending}
            >
                {isPending ? 'Leaving' : armed ? 'Press again to leave' : 'Leave club'}
            </button>
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
