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
 *    also what clears the stale "/" left behind by v1;
 *  - keeps one page, /offline, with the CSS and scripts it links, and shows
 *    it when a page cannot be reached at all (v3).
 *
 * It also shows web push notifications (src/lib/push.ts sends them). That
 * changes nothing about caching, so the cache name stays at v3.
 */
const CACHE = 'campus-connect-v3';
const OFFLINE = '/offline';

/* The offline page plus the hashed files it needs, read out of its HTML, so
   it renders styled with no network. A failure here only means no offline
   page; it must not stop the worker installing. */
async function cacheOfflinePage() {
    const cache = await caches.open(CACHE);
    const res = await fetch(OFFLINE, { cache: 'reload' });
    if (!res.ok) return;
    const html = await res.clone().text();
    const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)]+/g) || [])];
    await cache.put(OFFLINE, res);
    await Promise.all(assets.map((a) => cache.add(a).catch(() => {})));
}

self.addEventListener('install', (event) => {
    event.waitUntil(
        Promise.all([
            caches.open(CACHE).then((cache) => cache.addAll(['/icon.svg'])),
            cacheOfflinePage().catch(() => {}),
        ])
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
    // A page: always the network, and the offline page only when there is none.
    if (request.mode === 'navigate') {
        event.respondWith(fetch(request).catch(() => caches.match(OFFLINE).then((hit) => hit || Response.error())));
    }
    // Everything else goes straight to the network.
});

/* A path on this site, or the home page. The payload comes from our server,
   but a notification must never open somewhere else even if it did not. */
function sitePath(url) {
    try {
        const u = new URL(url || '/', self.location.origin);
        return u.origin === self.location.origin ? u.pathname + u.search + u.hash : '/';
    } catch {
        return '/';
    }
}

self.addEventListener('push', (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch {
        data = { body: event.data ? event.data.text() : '' };
    }
    const url = sitePath(data.url);
    event.waitUntil(
        self.registration.showNotification(data.title || 'Campus Connect', {
            body: data.body || '',
            icon: '/icon/192',
            badge: '/icon/192',
            // One notification per link: three messages in the same chat
            // replace each other instead of stacking, and still alert.
            tag: url,
            renotify: true,
            data: { url },
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const target = new URL(sitePath(event.notification.data && event.notification.data.url), self.location.origin).href;
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((tabs) => {
            const open = tabs.find((tab) => tab.url === target);
            return open ? open.focus() : self.clients.openWindow(target);
        })
    );
});
