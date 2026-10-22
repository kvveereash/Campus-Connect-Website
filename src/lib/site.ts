import type { Metadata } from 'next';

/** The live address. Shared links, the sitemap and canonical URLs all use it,
    so a preview deploy never advertises itself as the real site. */
export const SITE_URL = 'https://campusconnect2026.netlify.app';
export const SITE_NAME = 'Campus Connect';

/**
 * Open Graph and canonical tags for one page. A page's `openGraph` replaces the
 * root layout's whole object rather than merging with it, so the site name and
 * locale are repeated here. The image comes from the route's
 * opengraph-image.tsx, which Next adds on its own.
 */
export function shareMetadata({
    title,
    description,
    path,
    type = 'website',
}: {
    title: string;
    description: string;
    path: string;
    type?: 'website' | 'article';
}): Pick<Metadata, 'openGraph' | 'alternates'> {
    return {
        alternates: { canonical: path },
        openGraph: {
            title,
            description,
            url: path,
            type,
            siteName: SITE_NAME,
            locale: 'en_IN',
        },
    };
}
