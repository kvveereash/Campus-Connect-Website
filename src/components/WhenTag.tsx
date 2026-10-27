'use client';

import { useSyncExternalStore } from 'react';
import { timeLabel } from '@/app/events/press';
import { useT } from '@/lib/i18n';
import type { MessageKey } from '@/lib/i18n/messages';

/* timeLabel speaks English (it is shared with server code); this puts each
   of its few shapes into the reader's language. */
function translate(label: string, t: (k: MessageKey, v?: Record<string, number>) => string) {
    if (label === 'Happening now') return t('when.now');
    if (label === 'Today') return t('when.today');
    if (label === 'Tomorrow') return t('when.tomorrow');
    const mins = label.match(/^Starts in (\d+) min$/);
    if (mins) return t('when.startsIn', { n: Number(mins[1]) });
    const hours = label.match(/^In (\d+) hours?$/);
    if (hours) return Number(hours[1]) === 1 ? t('when.inHour') : t('when.inHours', { n: Number(hours[1]) });
    return label;
}

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
    const t = useT();
    if (now === null) return null;
    const label = timeLabel(date, new Date(now * 60000));
    if (!label) return null;
    return (
        <span className={className} data-now={label === 'Happening now' ? 'true' : undefined}>
            {translate(label, t)}
        </span>
    );
}
