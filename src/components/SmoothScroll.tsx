'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';

/**
 * Lenis smooth scrolling.
 *
 * The wheel stops driving the scroll position directly and instead feeds a
 * value that eases toward its target each frame, which is what gives the
 * weighted, slightly heavy feel the rest of this design already asks for —
 * the same 1.25s glide easing the sections fade in on.
 *
 * Three things this has to get right, all of which are easy to miss:
 *
 * 1. Reduced motion. Hijacking the scroll wheel is the single most
 *    disorienting thing a site can do to someone who gets motion sick, so
 *    anyone who has asked for reduced motion keeps the browser's own scroll,
 *    untouched. This is checked live rather than once, because the setting
 *    can change while the page is open.
 *
 * 2. Modals. Lenis drives `window`, so a dialog that expects the page behind
 *    it to be frozen would still scroll. Body-scroll locks work by setting
 *    `overflow: hidden` on body, so watching for that and stopping Lenis
 *    keeps every existing modal working without any of them knowing Lenis
 *    exists.
 *
 * 3. Navigation. Lenis holds its own scroll position, so on a route change
 *    it has to be told to go back to the top; otherwise the next page opens
 *    wherever the last one was left.
 */
export default function SmoothScroll() {
    const pathname = usePathname();
    const instance = useRef<Lenis | null>(null);

    useEffect(() => {
        const query = window.matchMedia('(prefers-reduced-motion: reduce)');
        let lenis: Lenis | null = null;
        let observer: MutationObserver | null = null;

        const start = () => {
            if (lenis) return;

            lenis = new Lenis({
                // Roughly a second of travel after the wheel stops. Long
                // enough to feel weighted, short enough that a deliberate
                // scroll still lands where you meant it to.
                duration: 1.1,
                // An exponential ease-out: fast to begin, then a long settle.
                easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                // Touch devices already have momentum scrolling of their own,
                // and doubling it makes a phone feel broken.
                smoothWheel: true,
                touchMultiplier: 1,
                // Lenis drives its own rAF loop. Hand-rolling one is the usual
                // recipe, but it puts the page's ability to scroll at all
                // behind a loop this component has to keep alive correctly —
                // and Lenis preventDefaults the wheel, so if that loop ever
                // stops the page stops scrolling. Letting the library own it
                // removes that failure mode.
                autoRaf: true,
            });

            instance.current = lenis;

            // A modal locking the body should freeze the page behind it.
            observer = new MutationObserver(() => {
                const locked = document.body.style.overflow === 'hidden';
                if (locked) lenis?.stop();
                else lenis?.start();
            });
            observer.observe(document.body, {
                attributes: true,
                attributeFilter: ['style'],
            });
        };

        const stop = () => {
            observer?.disconnect();
            observer = null;
            lenis?.destroy();
            lenis = null;
            instance.current = null;
        };

        const sync = () => (query.matches ? stop() : start());

        sync();
        query.addEventListener('change', sync);

        return () => {
            query.removeEventListener('change', sync);
            stop();
        };
    }, []);

    /* A new route starts at the top, the way a page load does. Lenis keeps
       its own scroll position and patches window.scrollTo, so it has to be
       told directly and immediately — animating the jump would mean watching
       the previous page scroll away under the new one. */
    useEffect(() => {
        const lenis = instance.current;
        if (lenis) lenis.scrollTo(0, { immediate: true });
        else window.scrollTo(0, 0);
    }, [pathname]);

    return null;
}
