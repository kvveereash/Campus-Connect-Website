'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { Link2, LogOut, Pencil, Settings } from 'lucide-react';
import { User } from '@/types';
import { formatIST } from '@/lib/format';
import ProfileHero, { heroButton, heroButtonGhost, heroButtonPrimary } from './ProfileHero';

interface ProfileHeaderProps {
    user: User;
    badges: BadgeType[];
    counts: { attending: number; hosted: number; clubs: number };
    onEdit: () => void;
    onLogout: () => void;
}

export interface BadgeType {
    id: string;
    name: string;
    icon: string;
    description: string;
    earnedDate?: Date | string;
}

/** Your own profile's header: the shared hero with your own buttons in it. */
export default function ProfileHeader({ user, badges = [], counts, onEdit, onLogout }: ProfileHeaderProps) {
    const handleShareProfile = () => {
        const url = `${window.location.origin}/profile/${user.id}`;
        navigator.clipboard.writeText(url);
        toast.success('Profile link copied');
    };

    const since = user.createdAt
        ? `Member since ${formatIST(user.createdAt, { month: 'long', year: 'numeric' })}`
        : undefined;

    return (
        <ProfileHero
            name={user.name}
            avatar={user.avatar}
            department={user.department}
            year={user.year}
            college={user.college ? { id: user.college.id, name: user.college.name } : null}
            bio={user.bio}
            since={since}
            stats={[
                { label: 'Going to', value: counts.attending, mark: 'var(--press-technology)' },
                { label: 'Hosted', value: counts.hosted, mark: 'var(--press-cultural)' },
                { label: 'Clubs', value: counts.clubs, mark: 'var(--press-sports)' },
            ]}
            skills={user.skills ?? []}
            badges={badges}
            actions={
                <>
                    <button type="button" onClick={onEdit} className={heroButtonPrimary}>
                        <Pencil size={14} aria-hidden="true" /> Edit profile
                    </button>
                    <button type="button" onClick={handleShareProfile} className={heroButton}>
                        <Link2 size={14} aria-hidden="true" /> Copy link
                    </button>
                    <Link href="/settings" className={heroButtonGhost} aria-label="Settings">
                        <Settings size={15} aria-hidden="true" /> Settings
                    </Link>
                    <button type="button" onClick={onLogout} className={heroButtonGhost}>
                        <LogOut size={14} aria-hidden="true" /> Sign out
                    </button>
                </>
            }
        />
    );
}
