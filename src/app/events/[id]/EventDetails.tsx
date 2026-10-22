'use client';

import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import RegisterButton from '@/components/RegisterButton';
import TeamFinder from '@/components/TeamFinder';
import { TeamProvider } from '@/context/TeamContext';
import EventReviews from '@/components/EventReviews';
import PaymentReturn from '@/components/PaymentReturn';
import EventTicket from '@/components/EventTicket';
import { googleCalendarUrl } from '@/lib/calendar';
import { deleteEvent, type EventDetail } from '@/lib/actions/events';
import styles from './page.module.css';
import Reveal from '@/components/Reveal';
import { formatIST } from '@/lib/format';
import { eventPhoto } from '@/lib/college-images';

const noSubscribe = () => () => {};

export default function EventDetails({ event }: { event: EventDetail }) {
    const photo = eventPhoto(event);
    const router = useRouter();
    const { user } = useAuth();
    const [armed, setArmed] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const isOwner = Boolean(user && event.creatorId === user.id);
    // Stripe sends people back here; PaymentReturn needs the registration it
    // should verify against.
    const myRegistration = user?.registrations?.find((r) => r.eventId === event.id);
    const when = new Date(event.date);
    const isPast = when < new Date();
    const host = event.club ?? event.hostCollege;
    const hostHref = event.club ? `/clubs/${event.club.id}` : `/colleges/${event.hostCollege.id}`;
    const priceText = event.price === 0 ? 'Free' : `₹${event.price.toLocaleString('en-IN')}`;

    /* On a phone the register button sits under the description, a screen
       or more below the photo. While it is still below the fold, a bar at
       the bottom of the screen shows the price and takes you to it. It
       scrolls to the real button rather than copying it, so registering and
       paying keep one code path. It is rendered into <body>: inside the page
       it would be pinned to the page's entrance animation (a transform)
       instead of the screen for the first half second. */
    const actionsRef = useRef<HTMLDivElement>(null);
    const [actionsBelow, setActionsBelow] = useState(false);
    // null during server render and hydration, document.body after.
    const barRoot = useSyncExternalStore(
        noSubscribe,
        () => document.body,
        () => null,
    );
    const canRegister = !isPast && event.verified && !myRegistration;

    /* Measured on scroll rather than with an IntersectionObserver: that only
       reports crossings, so a jump straight past the button (a restored
       scroll position, a fast fling) left the bar up below it. */
    useEffect(() => {
        const el = actionsRef.current;
        if (!el || !canRegister) return;
        let frame = 0;
        const measure = () => {
            frame = 0;
            setActionsBelow(el.getBoundingClientRect().top > window.innerHeight);
        };
        const schedule = () => {
            if (!frame) frame = requestAnimationFrame(measure);
        };
        schedule();
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('scroll', schedule);
            window.removeEventListener('resize', schedule);
        };
    }, [canRegister]);

    const goToRegister = () => {
        const el = actionsRef.current;
        if (!el) return;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        el.querySelector<HTMLElement>('button, a')?.focus({ preventScroll: true });
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const result = await deleteEvent(event.id);
            if (result.success) {
                toast.success('Event deleted');
                router.push('/events');
            } else {
                toast.error(result.error || 'Could not delete this event');
                setDeleting(false);
                setArmed(false);
            }
        } catch {
            toast.error('Could not delete this event');
            setDeleting(false);
            setArmed(false);
        }
    };

    return (
        <div className={styles.page}>
            {/* useSearchParams opts a page out of static rendering unless it
                sits behind a Suspense boundary — the production build fails
                otherwise, as it did on /login earlier in this project. */}
            <Suspense fallback={null}>
                <PaymentReturn eventId={event.id} registrationId={myRegistration?.id} />
            </Suspense>

            {canRegister && barRoot && createPortal(
                <div className={styles.registerBar} data-visible={actionsBelow} aria-hidden={!actionsBelow}>
                    <p className={styles.registerBarText}>
                        <b>{priceText}</b>
                        <span>
                            {formatIST(when, { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                    </p>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={goToRegister}
                        tabIndex={actionsBelow ? 0 : -1}
                    >
                        Register
                    </button>
                </div>,
                barRoot,
            )}

            <Link href="/events" className={styles.back}>
                <ArrowLeft size={13} aria-hidden="true" />
                All events
            </Link>

            <header className={styles.masthead}>
                <div className={styles.eyebrow}>
                    <span className={styles.eyebrowInk}>{event.category}</span>
                    <span className={styles.eyebrowRule}>/</span>
                    <span>{priceText}</span>
                    <span className={styles.eyebrowRule}>/</span>
                    <span>{isPast ? 'Past' : 'Upcoming'}</span>
                    {/* Only the creator ever sees an unverified event. */}
                    {!event.verified && <span className={styles.pending}>Awaiting approval</span>}
                </div>

                <h1 className={styles.title}>{event.title}</h1>

                <p className={styles.host}>
                    Hosted by{' '}
                    <Link href={hostHref} className={styles.hostLink}>
                        {host?.name ?? 'Campus Connect'}
                    </Link>
                </p>
            </header>

            {photo && (
                <div className={styles.hero}>
                    <Image
                        src={photo}
                        alt=""
                        fill
                        priority
                        sizes="(max-width: 1078px) 100vw, 1078px"
                    />
                </div>
            )}

            <Reveal>
            <div className={styles.body}>
                <div>
                    <p className={styles.sectionLabel}>About</p>
                    <p className={styles.prose}>{event.description}</p>
                </div>

                <aside>
                    <dl className={styles.facts}>
                        <div className={styles.fact}>
                            <dt className={styles.factKey}>When</dt>
                            <dd className={styles.factValue}>
                                {formatIST(when, {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                })}
                                <small>
                                    {formatIST(when, {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                    })}
                                </small>
                                {!isPast && event.verified && (
                                    <span className={styles.calendar}>
                                        <a
                                            href={googleCalendarUrl({ ...event, collegeName: event.hostCollege.name })}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            Google Calendar
                                        </a>
                                        <a href={`/events/${event.id}/calendar.ics`} download>
                                            Apple, Outlook (.ics)
                                        </a>
                                    </span>
                                )}
                            </dd>
                        </div>

                        <div className={styles.fact}>
                            <dt className={styles.factKey}>Where</dt>
                            <dd className={styles.factValue}>
                                {event.venue}
                                <small>{event.hostCollege.name}</small>
                            </dd>
                        </div>

                        <div className={styles.fact}>
                            <dt className={styles.factKey}>Entry</dt>
                            <dd className={styles.factValue}>
                                {event.price === 0 ? 'Free to attend' : `₹${event.price.toLocaleString('en-IN')}`}
                            </dd>
                        </div>

                        <div className={styles.actions} ref={actionsRef}>
                            {/* The server refuses registration for past and
                                unapproved events; say so instead of offering a
                                button that can only fail. */}
                            {isPast ? (
                                <button className="btn btn-outline" disabled>Registration closed</button>
                            ) : !event.verified ? (
                                <button className="btn btn-outline" disabled>Awaiting approval</button>
                            ) : (
                                <RegisterButton eventId={event.id} price={event.price || 0} />
                            )}
                        </div>

                        <EventTicket eventId={event.id} registered={Boolean(myRegistration)} />

                        {isOwner && (
                            <div className={styles.ownerActions}>
                                <Link
                                    href={`/events/${event.id}/attendees`}
                                    className={styles.ownerLink}
                                >
                                    Attendees
                                </Link>
                                <Link
                                    href={`/events/${event.id}/edit`}
                                    className={styles.ownerLink}
                                >
                                    Edit
                                </Link>
                                {armed ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={handleDelete}
                                            disabled={deleting}
                                            className={`${styles.ownerBtn} ${styles.ownerBtnArmed}`}
                                        >
                                            {deleting ? 'Deleting' : 'Confirm delete'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setArmed(false)}
                                            disabled={deleting}
                                            className={styles.ownerBtn}
                                        >
                                            Keep
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setArmed(true)}
                                        className={styles.ownerBtn}
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                        )}
                    </dl>
                </aside>
            </div>
            </Reveal>

            {/* TeamProvider was mounted globally, so every page paid for its
                state. Only this component consumes it. */}
            <section className={styles.panel}>
                <TeamProvider>
                    <TeamFinder eventId={event.id} />
                </TeamProvider>
            </section>

            {/* The component decides what to show: the ratings once the event
                has happened, and a line saying when they open before that. */}
            <section className={styles.panel}>
                <EventReviews eventId={event.id} isPastEvent={isPast} />
            </section>
        </div>
    );
}
