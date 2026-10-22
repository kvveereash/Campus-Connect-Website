'use client';

import { useEffect, useState } from 'react';
import { getMyTicket } from '@/lib/actions/check-in';
import { formatIST } from '@/lib/format';
import styles from '@/app/events/[id]/page.module.css';

type Ticket = NonNullable<Awaited<ReturnType<typeof getMyTicket>>>;

/**
 * Your ticket for an event you are going to: a QR code the organiser scans at
 * the entrance, and a short code to read out if their camera will not focus.
 * Fetched by the browser because the event page is shared by everyone.
 */
export default function EventTicket({ eventId, registered }: { eventId: string; registered: boolean }) {
    const [ticket, setTicket] = useState<Ticket | null>(null);

    useEffect(() => {
        if (!registered) return;
        let live = true;
        getMyTicket(eventId)
            .then((t) => {
                if (live) setTicket(t);
            })
            .catch(() => {
                // No ticket shown is the right failure: registration itself is unaffected.
            });
        return () => {
            live = false;
        };
    }, [eventId, registered]);

    if (!registered || !ticket) return null;

    return (
        <div id="ticket" role="region" className={styles.ticket} data-in={ticket.checkedInAt ? 'true' : undefined} aria-label="Your ticket">
            <p className={styles.ticketLabel}>{ticket.checkedInAt ? 'You are in' : 'Your ticket'}</p>
            {/* SVG made on our server by the qrcode library from our own URL. */}
            <div className={styles.ticketCode} dangerouslySetInnerHTML={{ __html: ticket.qrSvg }} />
            <p className={styles.ticketId}>{ticket.code}</p>
            <p className={styles.ticketNote}>
                {ticket.checkedInAt
                    ? `Checked in at ${formatIST(ticket.checkedInAt, { hour: 'numeric', minute: '2-digit' })}.`
                    : 'Show this at the entrance. A screenshot works too.'}
            </p>
        </div>
    );
}
