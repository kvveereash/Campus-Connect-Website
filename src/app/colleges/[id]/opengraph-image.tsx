import { renderShareCard, renderSiteCard, SHARE_SIZE } from '@/lib/share-card';
import { getCollegeShare } from '@/lib/share';
import { resolveCollegeImage } from '@/lib/college-images';

export const alt = 'A college on Campus Connect';
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
    const college = await getCollegeShare(id);
    if (!college) return renderSiteCard();

    return renderShareCard({
        kind: 'College',
        title: college.name,
        lead: 'Every club and event,',
        accent: 'on one board.',
        meta: [
            college.location,
            // "0 upcoming events" reads as a dead page; leave out what is empty.
            [
                college._count.clubs > 0 && plural(college._count.clubs, 'club', 'clubs'),
                college._count.events > 0 && plural(college._count.events, 'upcoming event', 'upcoming events'),
            ]
                .filter(Boolean)
                .join(' · '),
        ],
        photo: resolveCollegeImage({ name: college.name }),
    });
}
