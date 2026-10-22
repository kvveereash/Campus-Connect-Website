import { renderSiteCard, SHARE_SIZE } from '@/lib/share-card';

export const alt = 'Campus Connect: find what’s on, find your people.';
export const size = SHARE_SIZE;
export const contentType = 'image/png';

export default function Image() {
    return renderSiteCard();
}
