import { getEventById } from '@/lib/actions/events';
import EditEventClient from './EditEventClient';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function EditEventPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const { id } = params;
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    const event = await getEventById(id);

    if (!event) {
        redirect('/events'); // Or 404 page
    }

    // Server-side authorization check
    if (event.creatorId !== session.userId) {
        // In a real app, maybe show a "Forbidden" page
        redirect(`/events/${id}`);
    }

    return <EditEventClient event={event} />;
}
