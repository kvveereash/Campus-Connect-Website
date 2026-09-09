'use client';

import Link from 'next/link';
import styles from './Marquee.module.css';

export interface MarqueeItem {
    id: string;
    label: string;
    meta?: string;
    href?: string;
}

interface Props {
    items: MarqueeItem[];
    /** Seconds for one full pass. Longer = slower. */
    duration?: number;
    /** 'left' reads naturally; 'right' is for a second band running against it. */
    direction?: 'left' | 'right';
    /** Inverted band (paper on ink) or plain (ink on paper). */
    tone?: 'ink' | 'paper';
    label?: string;
}

/**
 * A band of text running continuously across the page.
 *
 * The site had a ticker once and it was removed, because what it ran was a
 * list of invented buzzwords — motion standing in for content. This one only
 * carries rows that exist: real events, with their real dates and venues,
 * each linking to its own page. If there is nothing to say it renders
 * nothing rather than looping filler.
 *
 * The loop works by rendering the list twice and translating the track by
 * exactly -50%: at the end of the animation the second copy sits precisely
 * where the first began, so the restart is invisible. Only `transform` is
 * animated, which the compositor can run without touching layout or paint.
 */
export default function Marquee({
    items,
    duration = 46,
    direction = 'left',
    tone = 'ink',
    label,
}: Props) {
    if (items.length === 0) return null;

    // Two identical passes. aria-hidden on the second so a screen reader is
    // not read the same list twice.
    const run = (hidden: boolean) => (
        <div className={styles.run} aria-hidden={hidden || undefined}>
            {items.map((item) => {
                const body = (
                    <>
                        <span className={styles.label}>{item.label}</span>
                        {item.meta && <span className={styles.meta}>{item.meta}</span>}
                        <span className={styles.sep} aria-hidden="true">
                            &#8226;
                        </span>
                    </>
                );
                return item.href && !hidden ? (
                    <Link key={item.id} href={item.href} className={styles.item}>
                        {body}
                    </Link>
                ) : (
                    <span key={item.id} className={styles.item}>
                        {body}
                    </span>
                );
            })}
        </div>
    );

    return (
        <div
            className={`${styles.band} ${tone === 'paper' ? styles.paper : styles.ink}`}
            aria-label={label}
        >
            <div
                className={`${styles.track} ${direction === 'right' ? styles.reverse : ''}`}
                style={{ animationDuration: `${duration}s` }}
            >
                {run(false)}
                {run(true)}
            </div>
        </div>
    );
}
