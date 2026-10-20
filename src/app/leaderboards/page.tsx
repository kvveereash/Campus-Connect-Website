import { Metadata } from 'next';
import LeaderboardsClient from './LeaderboardsClient';
import { getAllLeaderboards } from '@/lib/actions/leaderboards';

export const metadata: Metadata = {
    title: 'Leaderboards',
    description: 'See top event attendees, hosts, and most active clubs on campus.',
};

// Nothing on this page reads cookies or params, so Next prerendered it once at
// build time and the standings never moved until the next deploy (and stayed
// empty if the database was unreachable during that build). Refreshed every
// minute instead.
export const revalidate = 60;

export default async function LeaderboardsPage() {
    const leaderboards = await getAllLeaderboards();

    return <LeaderboardsClient data={leaderboards} />;
}
