import { getUpcomingEvents } from '@/lib/actions';
import LandingClient from './LandingClient';

export default async function LandingPage() {
    const upcomingEvents = await getUpcomingEvents(3);

    return (
        <LandingClient initialEvents={upcomingEvents} />
    );
}
