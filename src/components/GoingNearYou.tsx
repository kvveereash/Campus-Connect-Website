'use client';

import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getGoingNearYou, type GoingNearYou as Counts } from '@/lib/actions/going';
import styles from './GoingNearYou.module.css';

const people = (n: number) => (n === 1 ? '1 person' : `${n} people`);

/**
 * "3 people from IIT Mumbai and 2 from your clubs are going": the strongest
 * reason to say yes, as counts only. Shows nothing until there is something
 * to say, so the page never jumps for anyone else.
 */
export default function GoingNearYou({ eventId }: { eventId: string }) {
    const { user } = useAuth();
    const signedIn = Boolean(user);
    const [counts, setCounts] = useState<Counts | null>(null);

    useEffect(() => {
        if (!signedIn) return;
        let live = true;
        getGoingNearYou(eventId)
            .then((c) => live && setCounts(c))
            .catch(() => {});
        return () => {
            live = false;
        };
    }, [eventId, signedIn]);

    if (!signedIn || !counts || (counts.college === 0 && counts.clubs === 0)) return null;

    const parts: string[] = [];
    if (counts.college > 0) parts.push(`${people(counts.college)} from ${counts.collegeName ?? 'your college'}`);
    if (counts.clubs > 0) parts.push(`${counts.college > 0 ? counts.clubs : people(counts.clubs)} from your clubs`);
    const total = counts.college + counts.clubs;

    return (
        <p className={styles.line}>
            <Users size={16} aria-hidden="true" />
            <span>
                {parts.join(' and ')} {total === 1 ? 'is' : 'are'} going.
            </span>
        </p>
    );
}
