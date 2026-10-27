import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { getSitemapEntries } from '@/lib/share';

// Rebuilt hourly: a new event shows up for crawlers within the hour without
// the sitemap costing a database read per request.
export const revalidate = 3600;

const STATIC_PAGES: { path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'yearly' }[] = [
    { path: '/', priority: 1, changeFrequency: 'daily' },
    { path: '/events', priority: 0.9, changeFrequency: 'daily' },
    { path: '/fests', priority: 0.8, changeFrequency: 'daily' },
    { path: '/clubs', priority: 0.8, changeFrequency: 'daily' },
    { path: '/colleges', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/buzz', priority: 0.7, changeFrequency: 'daily' },
    { path: '/leaderboards', priority: 0.5, changeFrequency: 'daily' },
    { path: '/about', priority: 0.4, changeFrequency: 'yearly' },
    { path: '/legal/terms', priority: 0.2, changeFrequency: 'yearly' },
    { path: '/legal/privacy', priority: 0.2, changeFrequency: 'yearly' },
    { path: '/legal/refunds', priority: 0.2, changeFrequency: 'yearly' },
    { path: '/legal/guidelines', priority: 0.2, changeFrequency: 'yearly' },
    { path: '/legal/credits', priority: 0.1, changeFrequency: 'yearly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const pages: MetadataRoute.Sitemap = STATIC_PAGES.map(({ path, priority, changeFrequency }) => ({
        url: `${SITE_URL}${path}`,
        changeFrequency,
        priority,
    }));

    // If the database is unreachable the fixed pages are still worth serving;
    // a failed sitemap would drop the whole site from the next crawl.
    try {
        const { events, clubs, colleges, fests } = await getSitemapEntries();
        const now = Date.now();
        return [
            ...pages,
            ...events.map((e) => ({
                url: `${SITE_URL}/events/${e.id}`,
                lastModified: e.verifiedAt ?? undefined,
                changeFrequency: 'weekly' as const,
                // Upcoming events are what people search for.
                priority: e.date.getTime() >= now ? 0.8 : 0.3,
            })),
            ...fests.map((f) => ({
                url: `${SITE_URL}/fests/${f.id}`,
                lastModified: f.updatedAt,
                changeFrequency: 'weekly' as const,
                priority: f.endDate.getTime() >= now ? 0.8 : 0.3,
            })),
            ...colleges.map((c) => ({
                url: `${SITE_URL}/colleges/${c.id}`,
                lastModified: c.updatedAt,
                changeFrequency: 'weekly' as const,
                priority: 0.7,
            })),
            ...clubs.map((c) => ({
                url: `${SITE_URL}/clubs/${c.id}`,
                lastModified: c.updatedAt,
                changeFrequency: 'weekly' as const,
                priority: 0.6,
            })),
        ];
    } catch (error) {
        console.error('Sitemap: could not read events, clubs and colleges:', error);
        return pages;
    }
}
