import Image from 'next/image';
import Link from 'next/link';
import { eventPhoto } from '@/lib/college-images';
import { inkFor, dateParts } from './press';
import styles from './press.module.css';

/** What a row needs, so the board and "My events" can both pass their own query's shape. */
export type RowEvent = {
    id: string;
    title: string;
    date: Date | string;
    venue: string;
    category: string;
    price: number;
    thumbnail: string | null;
    registrationCount?: number | null;
    club?: { name: string } | null;
    hostCollege?: { name: string } | null;
};

/** The Prisma select that yields a RowEvent, for server pages listing rows. */
export const ROW_EVENT_SELECT = {
    id: true,
    title: true,
    date: true,
    venue: true,
    category: true,
    price: true,
    thumbnail: true,
    registrationCount: true,
    club: { select: { name: true } },
    hostCollege: { select: { name: true } },
} as const;

export function hostOf(event: Pick<RowEvent, 'club' | 'hostCollege'>) {
    return event.club?.name || event.hostCollege?.name || 'Campus';
}

function initialsOf(title: string) {
    return title
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0] ?? '')
        .join('')
        .toUpperCase();
}

/**
 * One event on the board: date tab, title, where and who, tags, cover.
 * `note` adds a tag after the price, for a status the board itself never
 * shows ("Payment pending" on My events).
 */
export default function EventRow({ event, note }: { event: RowEvent; note?: string }) {
    const ink = inkFor(event.category);
    const photo = eventPhoto(event);
    const { month, day, weekday } = dateParts(event.date);
    const going = event.registrationCount ?? 0;

    return (
        <Link
            href={`/events/${event.id}`}
            className={styles.row}
            style={{ ['--cat' as string]: ink }}
        >
            <div className={styles.date}>
                <div className={styles.dateMonth}>{month}</div>
                <div className={styles.dateDay}>{day}</div>
                <div className={styles.dateWeekday}>{weekday}</div>
            </div>

            <div>
                <h3 className={styles.rowTitle}>{event.title}</h3>
                <div className={styles.rowMeta}>
                    <span>{event.venue}</span>
                    <span className={styles.sep}>/</span>
                    <span>{hostOf(event)}</span>
                </div>
                <div className={styles.rowTags}>
                    <span className={styles.cat}>
                        <i aria-hidden="true" />
                        {event.category}
                    </span>
                    <span className={`${styles.price} ${event.price > 0 ? '' : styles.priceFree}`}>
                        {event.price > 0 ? `₹${event.price.toLocaleString('en-IN')}` : 'Free'}
                    </span>
                    {note && <span className={styles.note}>{note}</span>}
                    {/* Zero is not shown — the old card advertised "0 Reg." */}
                    {going > 0 && <span className={styles.going}>{going} going</span>}
                </div>
            </div>

            <div className={styles.cover}>
                {photo ? (
                    <Image
                        src={photo}
                        alt=""
                        fill
                        sizes="132px"
                        style={{ objectFit: 'cover' }}
                    />
                ) : (
                    <div className={styles.coverStub} aria-hidden="true">
                        <span>{initialsOf(event.title)}</span>
                    </div>
                )}
            </div>
        </Link>
    );
}
