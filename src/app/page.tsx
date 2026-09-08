import { getUpcomingEvents } from '@/lib/actions';
import { getLandingStats, getCategoryBand, getFeaturedClubs } from '@/lib/actions/landing';
import LandingClient from './LandingClient';

// The landing page reflects live counts and the next events, so it is rendered
// per request rather than served as a build-time snapshot.
export const dynamic = 'force-dynamic';

export default async function LandingPage() {
    const [events, stats, categories, clubs] = await Promise.all([
        getUpcomingEvents(3),
        getLandingStats(),
        getCategoryBand(),
        getFeaturedClubs(6),
    ]);

    return (
        <LandingClient
            initialEvents={events}
            stats={stats}
            categories={categories}
            clubs={clubs}
        />
    );
}
