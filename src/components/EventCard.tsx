'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Share2 } from 'lucide-react';
import { resolveEventImage } from '@/lib/college-images';
import { EventWithRelations } from '@/lib/actions';
import { dateParts, inkFor } from '@/app/events/press';
import { formatIST } from '@/lib/format';
import { useModal } from '@/context/ModalContext';
import styles from './EventCard.module.css';

interface EventCardProps {
    event: EventWithRelations;
    /** Kept for callers that pass it; the card no longer staggers itself. */
    index?: number;
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=800';

/**
 * An event as a card: the same card the landing page and events board use,
 * so an event looks like itself wherever it turns up (profiles, colleges).
 */
export default function EventCard({ event }: EventCardProps) {
    const { openModal } = useModal();
    const [imgSrc, setImgSrc] = useState(resolveEventImage(event.category, event.thumbnail, event.title));

    const d = dateParts(event.date);
    const time = formatIST(event.date, { hour: 'numeric', minute: '2-digit' });
    const host = event.club?.name || event.hostCollege?.name;
    const going = event.registrationCount ?? 0;
    const price = event.price > 0 ? `₹${event.price.toLocaleString('en-IN')}` : 'Free';

    const handleShare = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        openModal('SHARE', {
            eventUrl: `${window.location.origin}/events/${event.id}`,
            eventName: event.title,
        });
    };

    return (
        <Link href={`/events/${event.id}`} className={styles.card}>
            <div className={styles.media}>
                <Image
                    src={imgSrc}
                    alt=""
                    fill
                    sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
                    onError={() => setImgSrc(FALLBACK_IMAGE)}
                />
                <span className={styles.dateTab}>
                    <b>{d.day}</b>
                    <i>{d.month}</i>
                </span>
                <button
                    type="button"
                    onClick={handleShare}
                    className={styles.share}
                    aria-label={`Share ${event.title}`}
                >
                    <Share2 size={14} aria-hidden="true" />
                </button>
            </div>

            <div className={styles.body}>
                <span className={styles.cat}>
                    <span className={styles.square} style={{ background: inkFor(event.category) }} aria-hidden="true" />
                    {event.category || 'Event'}
                </span>
                <h3 className={styles.title}>{event.title || 'Untitled event'}</h3>
                <span className={styles.meta}>
                    {d.weekday}, {time}
                    {event.venue ? ` · ${event.venue}` : ''}
                </span>
                {host && <span className={styles.host}>Hosted by {host}</span>}
                <span className={styles.foot}>
                    <span className={`${styles.price} ${event.price > 0 ? '' : styles.free}`}>{price}</span>
                    {going > 0 && <span className={styles.going}>{going} going</span>}
                </span>
            </div>
        </Link>
    );
}
