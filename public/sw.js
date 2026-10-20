/*
 * Campus Connect service worker.
 *
 * The first version precached "/" and answered every request cache-first,
 * forever. After a deploy, returning visitors were served the old landing
 * page, pointing at script chunks that no longer existed. This version:
 *
 *  - never caches pages: navigations always go to the network, so a deploy
 *    is visible on the next load;
 *  - caches only Next's hashed static assets, which never change under the
 *    same URL, so cache-first is safe for them;
 *  - deletes every cache from an older version when it activates, which is
 *    also what clears the stale "/" left behind by v1.
 */
const CACHE = 'campus-connect-v2';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE).then((cache) => cache.addAll(['/icon.svg', '/manifest.json']))
    );
    // Take over from v1 straight away instead of waiting for every tab to close.
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    // Hashed build output: immutable, so serve from cache and fill on miss.
    if (url.pathname.startsWith('/_next/static/')) {
        event.respondWith(
            caches.match(request).then(
                (hit) =>
                    hit ||
                    fetch(request).then((res) => {
                        if (res.ok) {
                            const copy = res.clone();
                            caches.open(CACHE).then((cache) => cache.put(request, copy));
                        }
                        return res;
                    })
            )
        );
    }
    // Everything else, pages included, goes straight to the network.
});
