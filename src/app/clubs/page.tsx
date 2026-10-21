import { getClubs } from '@/lib/actions/clubs';
import ClubList from './ClubList';

// The same listing for everyone, so it is served from the CDN and rebuilt at
// most every two minutes (joining or creating a club refreshes it). Which
// clubs are yours is fetched by the browser, in ClubList.
export const revalidate = 120;

export default async function ClubsPage() {
    const clubs = await getClubs();
    return <ClubList initialClubs={clubs} />;
}
