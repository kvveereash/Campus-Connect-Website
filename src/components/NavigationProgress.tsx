'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import styles from './NavigationProgress.module.css';

// Most page changes come from the cache in well under this; showing a bar
// for them would only flicker.
const SHOW_AFTER_MS = 120;
// A navigation that never lands (offline, a link the app intercepted) must
// not leave the bar crawling forever.
const GIVE_UP_AFTER_MS = 10_000;

/**
 * A thin campus-blue bar across the top of the screen while the next page
 * loads. The App Router has no navigation events, so it starts on a click on
 * an internal link to another page and finishes when the pathname changes.
 * Search-only changes (filters) are left alone: they are in-page and fast.
 */
export default function NavigationProgress() {
    const pathname = usePathname();
    const barRef = useRef<HTMLDivElement>(null);
    const timers = useRef<{ show?: number; giveUp?: number; hide?: number }>({});
    const active = useRef(false);

    useEffect(() => {
        const bar = barRef.current;
        if (!bar) return;
        const t = timers.current;

        const clear = () => {
            window.clearTimeout(t.show);
            window.clearTimeout(t.giveUp);
            window.clearTimeout(t.hide);
        };

        const start = () => {
            clear();
            active.current = true;
            t.show = window.setTimeout(() => bar.setAttribute('data-state', 'loading'), SHOW_AFTER_MS);
            t.giveUp = window.setTimeout(() => {
                active.current = false;
                bar.removeAttribute('data-state');
            }, GIVE_UP_AFTER_MS);
        };

        const onClick = (event: MouseEvent) => {
            // Capture phase: Next's <Link> prevents the default later, in React's own handler.
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            const link = (event.target as Element | null)?.closest?.('a');
            if (!link || !link.href || link.hasAttribute('download')) return;
            if (link.target && link.target !== '_self') return;
            const url = new URL(link.href, window.location.href);
            if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
            start();
        };

        document.addEventListener('click', onClick, true);
        return () => {
            document.removeEventListener('click', onClick, true);
            clear();
        };
    }, []);

    // The new page has rendered: run the bar to the end, then fade it out.
    useEffect(() => {
        const bar = barRef.current;
        if (!bar || !active.current) return;
        active.current = false;
        const t = timers.current;
        window.clearTimeout(t.show);
        window.clearTimeout(t.giveUp);
        if (bar.getAttribute('data-state') !== 'loading') return; // landed before it showed

        // Freeze the bar where the crawl has got to, so finishing grows from
        // there instead of jumping back to the start.
        bar.style.transform = getComputedStyle(bar).transform;
        bar.setAttribute('data-state', 'done');
        requestAnimationFrame(() => {
            bar.style.transform = '';
        });
        t.hide = window.setTimeout(() => bar.removeAttribute('data-state'), 400);
    }, [pathname]);

    return <div ref={barRef} className={styles.bar} aria-hidden="true" />;
}
