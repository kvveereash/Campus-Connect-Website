import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getEventById } from '@/lib/actions/events';
import EventDetails from './EventDetails';

const summary = (text: string) => (text.length > 155 ? `${text.slice(0, 152)}…` : text);

// Each event page used to be titled just "Campus Connect" in tabs, search
// results and shared links.
export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await props.params;
    const event = await getEventById(id);
    if (!event) return { title: 'Event not found' };
    return {
        title: event.title,
        description: summary(event.description),
        openGraph: event.thumbnail ? { images: [{ url: event.thumbnail }] } : undefined,
    };
}

export default async function EventPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const { id } = params;

    const event = await getEventById(id);

    // notFound() rather than a hand-rolled message: this returns a real HTTP 404
    // so search engines and link checkers see a missing event as missing. The
    // previous version rendered "Event not found" with a 200 status.
    if (!event) notFound();

    return <EventDetails event={event} />;
}
