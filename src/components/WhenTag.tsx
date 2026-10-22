'use client';

import { useSyncExternalStore } from 'react';
import { timeLabel } from '@/app/events/press';

/* The minute, as a number, so the snapshot is stable within a minute. */
const minute = () => Math.floor(Date.now() / 60000);
const everyMinute = (tick: () => void) => {
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
};

/**
 * A relative time tag ("Starts in 40 min") for an event. Lists are served
 * from the CDN, so this is worked out in the browser: nothing is rendered on
 * the server, and it keeps itself current while the page is open.
 */
export default function WhenTag({ date, className }: { date: Date | string; className?: string }) {
    const now = useSyncExternalStore(everyMinute, minute, () => null);
    if (now === null) return null;
    const label = timeLabel(date, new Date(now * 60000));
    if (!label) return null;
    return (
        <span className={className} data-now={label === 'Happening now' ? 'true' : undefined}>
            {label}
        </span>
    );
}
