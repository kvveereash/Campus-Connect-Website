import { renderShareCard, renderSiteCard, SHARE_SIZE } from '@/lib/share-card';
import { getEventShare } from '@/lib/share';
import { resolveEventImage } from '@/lib/college-images';
import { formatIST } from '@/lib/format';

export const alt = 'An event on Campus Connect';
export const size = SHARE_SIZE;
export const contentType = 'image/png';
// None drawn at build time: each card is drawn on its first request, then
// served from cache; an edit to the event refreshes it through its cache tag.
export const revalidate = 3600;
export function generateStaticParams() {
    return [];
}

const rupees = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const event = await getEventShare(id);
    // A pending, rejected or deleted event is not public: share the site instead.
    if (!event) return renderSiteCard();

    const when = `${formatIST(event.date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${formatIST(event.date, {
        hour: 'numeric',
        minute: '2-digit',
    })} IST`;

    return renderShareCard({
        kind: 'Event',
        category: event.category,
        title: event.title,
        lead: 'at',
        accent: event.hostCollege.name,
        meta: [when, event.venue],
        chip: event.price > 0 ? `₹${rupees.format(event.price)}` : 'Free entry',
        photo: resolveEventImage(event.category, event.thumbnail, event.title),
    });
}
