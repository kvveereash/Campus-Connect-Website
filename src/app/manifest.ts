import type { MetadataRoute } from 'next';

// Replaces public/manifest.json, which still had the old dark-navy theme and
// only an SVG icon (Android wants PNGs to offer "Install app").
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Campus Connect',
        short_name: 'Campus Connect',
        description: 'Events, clubs and teammates across Indian colleges.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f5f4f0', // --color-canvas, so the splash screen matches the board
        theme_color: '#f5f4f0',
        categories: ['education', 'social'],
        icons: [
            { src: '/icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icon/maskable', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
            { name: 'Events', url: '/events' },
            { name: 'Messages', url: '/messages' },
            { name: 'Buzz', url: '/buzz' },
        ],
    };
}
