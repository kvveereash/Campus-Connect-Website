'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getEventsForYou } from '@/lib/actions/for-you';
import type { EventWithRelations } from '@/lib/actions';
import { dateParts, inkFor } from './press';
import styles from './ForYou.module.css';

type Pick = Awaited<ReturnType<typeof getEventsForYou>>[number];

/**
 * Up to three events picked for the signed-in student, above the full list.
 * Shows nothing until the picks arrive and nothing when there are none, so
 * the board never jumps for someone who is signed out.
 */
export default function ForYou({ events }: { events: EventWithRelations[] }) {
    const { user } = useAuth();
    const signedIn = Boolean(user);
    const [picks, setPicks] = useState<Pick[]>([]);

    useEffect(() => {
        if (!signedIn) return;
        let live = true;
        getEventsForYou()
            .then((p) => {
                if (live) setPicks(p);
            })
            .catch(() => {
                // The board below is complete without this.
            });
        return () => {
            live = false;
        };
    }, [signedIn]);

    const byId = new Map(events.map((e) => [e.id, e]));
    // A pick missing from this (cached) list is skipped rather than fetched.
    const shown = signedIn
        ? picks.flatMap((p) => {
              const event = byId.get(p.id);
              return event ? [{ ...p, event }] : [];
          })
        : [];
    if (shown.length === 0) return null;

    return (
        <section className={styles.forYou} aria-labelledby="for-you-title">
            <div className={styles.head}>
                <h2 id="for-you-title">For you</h2>
                <span>Picked from your clubs, college and interests</span>
            </div>
            <ul className={styles.cards}>
                {shown.map(({ event, reason }) => {
                    const { month, day, weekday } = dateParts(event.date);
                    return (
                        <li key={event.id}>
                            <Link href={`/events/${event.id}`} className={styles.card} style={{ ['--cat' as string]: inkFor(event.category) }}>
                                <span className={styles.when}>
                                    {weekday} {day} {month}
                                </span>
                                <span className={styles.title}>{event.title}</span>
                                <span className={styles.reason}>{reason}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
