import { getUpcomingEvents } from '@/lib/actions';
import { getPlatformStats } from '@/lib/actions/profile';
import LandingClient from './LandingClient';

export default async function LandingPage() {
    const [upcomingEvents, stats] = await Promise.all([
        getUpcomingEvents(3),
        getPlatformStats(),
    ]);

    return <LandingClient initialEvents={upcomingEvents} stats={stats} />;
}
