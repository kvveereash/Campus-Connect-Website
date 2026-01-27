import Link from 'next/link';
import { getEventById } from '@/lib/actions/events';
import EventDetails from './EventDetails';

export default async function EventPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const { id } = params;

    const event = await getEventById(id);

    if (!event) {
        return (
            <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
                <h2>Event not found</h2>
                <Link href="/events" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                    Back to Events
                </Link>
            </div>
        );
    }

    return <EventDetails event={event} />;
}
