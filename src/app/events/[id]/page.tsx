import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getEventById, type EventDetail } from '@/lib/actions/events';
import { resolveEventImage } from '@/lib/college-images';
import { SITE_URL, shareMetadata } from '@/lib/site';
import EventDetails from './EventDetails';

const summary = (text: string) => (text.length > 155 ? `${text.slice(0, 152)}…` : text);

// Each event page used to be titled just "Campus Connect" in tabs, search
// results and shared links.
export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await props.params;
    const event = await getEventById(id);
    if (!event) return { title: 'Event not found' };
    const description = summary(event.description);
    return {
        title: event.title,
        description,
        ...shareMetadata({ title: event.title, description, path: `/events/${id}`, type: 'article' }),
    };
}

/* schema.org Event, so search results can show the date and place. Rendered
   only for approved events: a pending one is visible to its creator alone. */
function eventJsonLd(event: EventDetail) {
    const image = resolveEventImage(event.category, event.thumbnail, event.title);
    const json = {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: event.title,
        description: summary(event.description),
        // new Date(): unstable_cache hands dates back as strings despite the type.
        startDate: new Date(event.date).toISOString(),
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        url: `${SITE_URL}/events/${event.id}`,
        image: [new URL(image, SITE_URL).toString()],
        location: {
            '@type': 'Place',
            name: event.venue,
            address: { '@type': 'PostalAddress', name: event.hostCollege.name, addressCountry: 'IN' },
        },
        organizer: event.club
            ? { '@type': 'Organization', name: event.club.name, url: `${SITE_URL}/clubs/${event.club.id}` }
            : { '@type': 'CollegeOrUniversity', name: event.hostCollege.name, url: `${SITE_URL}/colleges/${event.hostCollege.id}` },
        offers: {
            '@type': 'Offer',
            price: event.price,
            priceCurrency: 'INR',
            availability: 'https://schema.org/InStock',
            url: `${SITE_URL}/events/${event.id}`,
        },
    };
    // Escape "<" so a title containing "</script>" cannot end the tag early.
    return JSON.stringify(json).replace(/</g, '\\u003c');
}

export default async function EventPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const { id } = params;

    const event = await getEventById(id);

    // notFound() rather than a hand-rolled message: this returns a real HTTP 404
    // so search engines and link checkers see a missing event as missing. The
    // previous version rendered "Event not found" with a 200 status.
    if (!event) notFound();

    return (
        <>
            {event.verified ? (
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: eventJsonLd(event) }} />
            ) : null}
            <EventDetails event={event} />
        </>
    );
}
