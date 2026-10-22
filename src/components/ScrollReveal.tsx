'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * The site's one scroll reveal, for every page but home (which has its own
 * choreography in HomeMotion). Wrap a list in <RevealGroup> and its children
 * rise in, in small staggered batches, as they come into view: event rows,
 * Buzz posts, team-finder cards. RevealGroup adds the `data-reveal-group`
 * marker only after it hydrates, and this waits for the marker to appear, so
 * GSAP never styles markup React has yet to hydrate.
 *
 * Only children that are below the fold when they appear are hidden, so
 * nothing on screen at load ever blinks out and back. Lists that load or
 * filter on the client are picked up as their rows arrive.
 *
 * GSAP is imported here on demand, after the page is interactive and only on
 * pages that have something to reveal, so it never sits in the first load.
 */
export default function ScrollReveal() {
    const pathname = usePathname();

    useEffect(() => {
        if (pathname === '/') return;

        let mm: gsap.MatchMedia | null = null;
        let cancelled = false;
        const begin = () => {
            Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([{ gsap }, { ScrollTrigger }]) => {
                if (cancelled) return;
                gsap.registerPlugin(ScrollTrigger);
                mm = gsap.matchMedia();
                start(gsap, ScrollTrigger, mm);
            });
        };

        // GSAP loads only once a group exists; a list behind Suspense
        // hydrates after this runs, so wait for its marker.
        let waiting: MutationObserver | null = null;
        if (document.querySelector('[data-reveal-group]')) {
            begin();
        } else {
            waiting = new MutationObserver(() => {
                if (!document.querySelector('[data-reveal-group]')) return;
                waiting?.disconnect();
                waiting = null;
                begin();
            });
            waiting.observe(document.querySelector('main') ?? document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['data-reveal-group'],
            });
        }

        return () => {
            cancelled = true;
            waiting?.disconnect();
            mm?.revert();
        };
    }, [pathname]);

    return null;
}

function start(gsap: typeof import('gsap').gsap, ScrollTrigger: typeof import('gsap/ScrollTrigger').ScrollTrigger, mm: gsap.MatchMedia) {
    {
        mm.add('(prefers-reduced-motion: no-preference)', () => {
            const seen = new WeakSet<Element>();
            let triggers: ScrollTrigger[] = [];
            let frame = 0;

            const setup = () => {
                frame = 0;
                const fresh = Array.from(document.querySelectorAll('[data-reveal-group] > *')).filter(
                    (el) => !seen.has(el),
                );
                if (!fresh.length) return;
                fresh.forEach((el) => seen.add(el));

                const below = fresh.filter((el) => el.getBoundingClientRect().top > window.innerHeight * 0.92);
                if (!below.length) return;

                gsap.set(below, { autoAlpha: 0, y: 32 });
                triggers.push(
                    ...ScrollTrigger.batch(below, {
                        start: 'top 94%',
                        once: true,
                        onEnter: (batch) =>
                            gsap.to(batch, {
                                autoAlpha: 1,
                                y: 0,
                                duration: 0.9,
                                stagger: 0.06,
                                ease: 'expo.out',
                                overwrite: true,
                            }),
                    }),
                );
                // Rows that left the page (a filter changed) take their
                // triggers with them; the rest are re-measured, since a list
                // that got shorter moves everything below it.
                triggers = triggers.filter((t) => {
                    const alive = (t.trigger as Element | undefined)?.isConnected;
                    if (!alive) t.kill();
                    return alive;
                });
                ScrollTrigger.refresh();
            };

            const schedule = () => {
                if (!frame) frame = requestAnimationFrame(setup);
            };

            setup();
            const observer = new MutationObserver(schedule);
            observer.observe(document.querySelector('main') ?? document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['data-reveal-group'],
            });

            return () => {
                observer.disconnect();
                if (frame) cancelAnimationFrame(frame);
            };
        });
    }
}
