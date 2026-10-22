import { renderShareCard, renderSiteCard, SHARE_SIZE } from '@/lib/share-card';
import { getClubShare } from '@/lib/share';

export const alt = 'A club on Campus Connect';
export const size = SHARE_SIZE;
export const contentType = 'image/png';
export const revalidate = 3600;
// None at build time: each card is drawn on its first request, then cached.
export function generateStaticParams() {
    return [];
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const club = await getClubShare(id);
    if (!club) return renderSiteCard();

    return renderShareCard({
        kind: 'Club',
        category: club.category,
        title: club.name,
        lead: 'a club at',
        accent: club.college.name,
        meta: [
            [
                club._count.members > 0 && plural(club._count.members, 'member', 'members'),
                club._count.events > 0 && plural(club._count.events, 'event', 'events'),
            ]
                .filter(Boolean)
                .join(' · '),
        ],
        // The club's own mark, or its initial: the club page never borrows a
        // stock photo for a club, so its share card does not either.
        photo: club.logo && /^https:\/\//.test(club.logo) ? club.logo : null,
        initial: club.name,
    });
}
