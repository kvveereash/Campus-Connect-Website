'use client';

import { useState, useTransition } from 'react';
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
        if (!confirm(`Are you sure you want to leave ${clubName}?`)) return;

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
                onClick={handleLeave}
                className={styles.leaveButton}
                disabled={isPending}
            >
                {isPending ? 'Leaving...' : 'Leave Club'}
            </button>
        );
    }

    return (
        <button
            onClick={handleJoin}
            className={styles.joinButton}
            disabled={isPending}
        >
            {isPending ? 'Joining...' : 'Join Club'}
        </button>
    );
}
