'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import { collegeCoords } from '@/lib/college-coords';
import styles from './VenueMap.module.css';

export type MapCollege = { name: string; events: number };

const escapeHtml = (s: string) =>
    s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

/**
 * The colleges with something coming up, as pins on a map of India. The list
 * below stays the main way through the page; this shows where things are.
 * Leaflet needs the browser, so it is loaded after the page is up. The wheel
 * does not zoom the map (it would fight the page's scroll); the buttons and
 * pinch do.
 */
export default function VenueMap({ colleges }: { colleges: MapCollege[] }) {
    const box = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = box.current;
        if (!el) return;
        let map: import('leaflet').Map | null = null;
        let cancelled = false;

        import('leaflet').then((L) => {
            if (cancelled) return;
            const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            map = L.map(el, {
                scrollWheelZoom: false,
                zoomAnimation: !still,
                fadeAnimation: !still,
                markerZoomAnimation: !still,
            });
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 17,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }).addTo(map);

            const accent = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#2f3bff';
            const points: [number, number][] = [];
            for (const c of colleges) {
                const at = collegeCoords(c.name);
                if (!at) continue;
                points.push(at);
                L.circleMarker(at, {
                    radius: Math.min(16, 7 + c.events),
                    color: accent,
                    weight: 2,
                    fillColor: accent,
                    fillOpacity: 0.35,
                })
                    .addTo(map)
                    .bindPopup(
                        `<strong>${escapeHtml(c.name)}</strong><br>${c.events} coming up<br>` +
                            `<a href="/events?q=${encodeURIComponent(c.name)}">See its events</a>`,
                    );
            }
            if (points.length > 0) map.fitBounds(points, { padding: [36, 36], maxZoom: 9 });
            else map.setView([21, 78], 4); // India
        });

        return () => {
            cancelled = true;
            map?.remove();
        };
    }, [colleges]);

    return <div ref={box} className={styles.map} role="region" aria-label="Map of colleges with events coming up" />;
}
