'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * The site's one scroll reveal, for every page but home (which has its own
 * choreography in HomeMotion). Mark a list container with
 * `data-reveal-group` and its children rise in, in small staggered batches,
 * as they come into view: event rows, Buzz posts, team-finder cards.
 *
 * Only children that are below the fold when they appear are hidden, so
 * nothing on screen at load ever blinks out and back. Lists that load or
 * filter on the client are picked up as their rows arrive.
 */
export default function ScrollReveal() {
    const pathname = usePathname();

    useEffect(() => {
        if (pathname === '/') return;

        const mm = gsap.matchMedia();
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
            observer.observe(document.querySelector('main') ?? document.body, { childList: true, subtree: true });

            return () => {
                observer.disconnect();
                if (frame) cancelAnimationFrame(frame);
            };
        });

        return () => mm.revert();
    }, [pathname]);

    return null;
}
