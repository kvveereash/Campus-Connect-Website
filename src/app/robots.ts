import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            // Pages that are private, need a session, or are one-time links.
            // Public profiles (/profile/[id]) stay crawlable; /profile alone is
            // your own and redirects to log in.
            disallow: [
                '/api/',
                '/admin',
                '/settings',
                '/messages',
                '/team-finder',
                '/profile$',
                '/events/create',
                '/events/*/edit',
                '/events/*/check-in',
                '/events/*/attendees',
                '/fests/create',
                '/fests/*/edit',
                '/offline',
                '/clubs/create',
                '/reset-password/',
                '/verify-email',
                '/forbidden',
                // Each one names a person and an event they attended.
                '/certificates/',
                // One-person unsubscribe links from the Monday email.
                '/digest/',
                // Widgets for other sites; the events themselves are indexed here.
                '/embed/',
            ],
        },
        sitemap: `${SITE_URL}/sitemap.xml`,
        host: SITE_URL,
    };
}
