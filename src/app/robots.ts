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
                '/offline',
                '/clubs/create',
                '/reset-password/',
                '/verify-email',
                '/forbidden',
            ],
        },
        sitemap: `${SITE_URL}/sitemap.xml`,
        host: SITE_URL,
    };
}
