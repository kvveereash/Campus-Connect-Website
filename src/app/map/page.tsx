import type { Metadata } from 'next';
import prisma from '@/lib/db';
import MapClient from './MapClient';

export const metadata: Metadata = {
    title: 'Venues',
    description: 'Every venue on campus with something coming up, and what is happening there.',
};

export const dynamic = 'force-dynamic';

/**
 * This route used to render a drawn campus: five hardcoded zones ("Main
 * Auditorium", "CS & Labs", "Sports Complex", "Cafeteria", "Library"), a "You
 * Are Here" marker with no geolocation behind it, and the subtitle "Real-time
 * event tracking system" over something that was neither real-time nor
 * tracking anything.
 *
 * It also did not work. Pin positions came from a table of eleven venue
 * strings, and everything that missed it fell back to one shared coordinate —
 * fourteen of the twenty upcoming events landed on the same point, stacked on
 * top of each other. The category filter offered "Tech", which matches no
 * category in the database (the real one is "Technology"), so that filter
 * emptied the map; four real categories had no filter at all.
 *
 * There is no latitude or longitude anywhere in the schema, so a spatial map
 * cannot be built from real data. What the data does support is the question
 * people actually bring here: where is anything happening, and what is on
 * there. So the page groups real events under their real venues.
 */
export default async function MapPage() {
    /* Guarded, unlike the version I first shipped.
     *
     * This was the only page in the app with a bare top-level query, and it
     * was the only route returning 500 on the deployed site — every other
     * page catches and degrades. A database the server cannot reach is not
     * this page's fault and not the reader's problem: it renders its own
     * "nothing scheduled" state instead of an error screen. */
    // The shape of the select below, not the whole Event model.
    type VenueRow = {
        id: string;
        title: string;
        venue: string;
        date: Date;
        category: string;
        hostCollege: { name: string; location: string } | null;
    };

    let events: VenueRow[] = [];
    try {
        events = await prisma.event.findMany({
            where: {
                date: { gte: new Date() },
                verified: true,
                deletedAt: null,
            },
            orderBy: { date: 'asc' },
            select: {
                id: true,
                title: true,
                venue: true,
                date: true,
                category: true,
                hostCollege: { select: { name: true, location: true } },
            },
        });
    } catch (error) {
        console.error('Failed to load venues:', error);
    }

    return (
        <MapClient
            events={events.map((e) => ({
                ...e,
                date: e.date.toISOString(),
                venue: e.venue?.trim() || 'Venue to be announced',
            }))}
        />
    );
}
