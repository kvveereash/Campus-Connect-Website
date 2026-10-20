/* Service worker: caches the app icon and manifest, nothing else.
 *
 * v1 pre-cached '/' and answered every request cache-first under a name that
 * never changed, so a returning visitor got the home page as it was on the day
 * the worker installed, frozen stats and events included. After a deploy that
 * stale HTML pointed at _next/static chunks that no longer existed, and the
 * page failed to hydrate. Pages are never cached now. The new name, plus the
 * activate step below, clear v1's cache from browsers that already have it. */
const CACHE_NAME = 'campus-connect-v2';
const PRECACHE = ['/icon.svg', '/manifest.json'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(PRECACHE))
            // Replace a v1 worker straight away rather than on the next visit.
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin || !PRECACHE.includes(url.pathname)) return;

    event.respondWith(
        caches.match(request).then((cached) => cached || fetch(request))
    );
});
