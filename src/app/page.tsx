import { getUpcomingEvents } from '@/lib/actions';
import { getLandingStats, getCategoryBand, getFeaturedClubs } from '@/lib/actions/landing';
import { getAllColleges } from '@/lib/actions/colleges';
import Landing from './Landing';

// The landing page reflects live counts and the next events, so it is rendered
// per request rather than served as a build-time snapshot.
export const dynamic = 'force-dynamic';

export default async function LandingPage() {
    // Eight for the hero deck and the week rail, a longer run for the
    // marquee. Both come from the same cached query, so the second is cheap.
    const [events, marqueeEvents, stats, categories, clubs, allColleges] = await Promise.all([
        getUpcomingEvents(8),
        getUpcomingEvents(14),
        getLandingStats(),
        getCategoryBand(),
        getFeaturedClubs(6),
        getAllColleges(),
    ]);

    // The index leads with the campuses that have the most going on.
    const colleges = [...allColleges]
        .sort((a, b) => b.clubs + b.events - (a.clubs + a.events))
        .slice(0, 8)
        .map(({ id, name, location, clubs, events }) => ({ id, name, location, clubs, events }));

    return (
        <Landing
            events={events}
            stats={stats}
            categories={categories}
            clubs={clubs}
            colleges={colleges}
            marquee={marqueeEvents.map((e) => e.title)}
        />
    );
}
