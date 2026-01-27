'use client';

import { toast } from 'sonner';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import RegisterButton from '@/components/RegisterButton';
import TeamFinder from '@/components/TeamFinder';
import EventReviews from '@/components/EventReviews';
import styles from './page.module.css';
import { deleteEvent } from '@/lib/actions/events';
import { EventWithRelations } from '@/lib/actions/events';

// Extend the type to include everything we need
type ExtendedEvent = any; // Using any temporarily to avoid strict type hell with partial matches, but ideally should be EventWithRelations

export default function EventDetails({ event }: { event: ExtendedEvent }) {
    const router = useRouter();
    const { user } = useAuth();

    const handleDelete = async () => {
        if (confirm('Are you sure you want to delete this event? This cannot be undone.')) {
            try {
                const result = await deleteEvent(event.id);
                if (result.success) {
                    toast.success('Event deleted successfully');
                    router.push('/events');
                } else {
                    toast.error(result.error || 'Failed to delete event');
                }
            } catch (error) {
                toast.error('Failed to delete event');
            }
        }
    };

    const hostCollege = event.hostCollege;
    const isOwner = user && event.creatorId === user.id;

    return (
        <div className="container">
            <Link href="/events" className={styles.backLink}>
                ← Back to Events
            </Link>

            <div className="card">
                <div className={styles.header}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span className={styles.category}>{event.category}</span>
                        <div className={`${styles.priceBadge} ${event.price === 0 ? styles.freeBadge : ''}`}>
                            {event.price === 0 ? 'FREE' : `$${event.price}`}
                        </div>
                    </div>
                    <span className={styles.date}>
                        {new Date(event.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </span>
                </div>

                <h1 className={styles.title}>{event.title}</h1>

                <div className={styles.hostInfo}>
                    Hosted by{' '}
                    {/* Handle both College and Club hosting */}
                    {event.club ? (
                        <Link href={`/clubs/${event.club.id}`} className={styles.hostLink}>
                            {event.club.name}
                        </Link>
                    ) : (
                        <Link href={`/colleges/${hostCollege?.id || ''}`} className={styles.hostLink}>
                            {hostCollege?.name || 'Unknown College'}
                        </Link>
                    )}
                </div>

                <div className={styles.venue}>
                    📍 {event.venue}
                </div>

                <div className={styles.description}>
                    <h3>About Event</h3>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{event.description}</p>
                </div>

                <div className={styles.actions}>
                    <RegisterButton eventId={event.id} price={event.price || 0} />

                    {isOwner && (
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <Link href={`/events/${event.id}/edit`} className="btn btn-outline">
                                Edit Event
                            </Link>
                            <button
                                onClick={handleDelete}
                                className="btn btn-outline"
                                style={{ borderColor: 'var(--error-color)', color: 'var(--error-color)' }}
                            >
                                Delete Event
                            </button>
                        </div>
                    )}
                </div>

                {/* Team Finder Section */}
                <TeamFinder eventId={event.id} />

                {/* Reviews Section - Only for past events */}
                <EventReviews eventId={event.id} isPastEvent={new Date(event.date) < new Date()} />
            </div>
        </div>
    );
}
