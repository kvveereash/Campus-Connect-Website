import { notFound } from 'next/navigation';
import { getEventById } from '@/lib/actions/events';
import EventDetails from './EventDetails';

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
