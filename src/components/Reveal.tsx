'use client';

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import styles from './Reveal.module.css';

interface Props {
    children: ReactNode;
    /** Seconds to hold before starting — for staggering siblings by hand. */
    delay?: number;
    /** 'up' is the default lift; 'none' fades without moving. */
    from?: 'up' | 'none';
    className?: string;
}

/** How far into the viewport a block must come before it reveals. */
const MARGIN = 70;

/**
 * Reveals its children when they scroll into view.
 *
 * A client component so that server-rendered pages — /about, the club
 * detail page — can use it without becoming client components themselves.
 *
 * The server HTML is the finished, visible block. Only once the script runs,
 * and only if the block is still below the fold, is it hidden to wait for
 * its entrance; a block already on screen is left alone, because hiding it
 * then would make it blink. So a slow or failed script costs the animation,
 * never the content.
 *
 * It reveals once, the first time it is reached, and then stays put.
 * Re-animating on every pass turns a long page into a flicker.
 */
export default function Reveal({ children, delay = 0, from = 'up', className }: Props) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el || typeof IntersectionObserver === 'undefined') return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        if (el.getBoundingClientRect().top < window.innerHeight - MARGIN) return;

        // A data attribute rather than state or a class: React never writes
        // it, so a re-render cannot undo it, and setting it is not a render.
        el.dataset.reveal = 'waiting';

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) return;
                el.dataset.reveal = 'shown';
                observer.disconnect();
            },
            { rootMargin: `0px 0px -${MARGIN}px 0px` }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const classes = [styles.reveal, from === 'none' && styles.flat, className]
        .filter(Boolean)
        .join(' ');

    return (
        <div
            ref={ref}
            className={classes}
            style={delay ? ({ '--delay': `${delay}s` } as CSSProperties) : undefined}
        >
            {children}
        </div>
    );
}
