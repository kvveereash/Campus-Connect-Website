'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView, animate, useReducedMotion } from 'framer-motion';

interface AnimatedCounterProps {
    from?: number;
    to: number;
    duration?: number;
    suffix?: string;
    className?: string;
    /** Zero-pad to this many digits, so 5 reads as 05 and the column keeps its shape. */
    pad?: number;
    /** Seconds to wait before counting — for staggering a row of these. */
    delay?: number;
}

/**
 * Animated counter that counts up from `from` to `to` when scrolled into view.
 * Uses Framer Motion spring for a natural deceleration curve.
 */
export default function AnimatedCounter({
    from = 0,
    to,
    duration = 2,
    suffix = '',
    className,
    pad = 0,
    delay = 0,
}: AnimatedCounterProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const isInView = useInView(ref, { once: true, margin: '-80px' });
    const reduced = useReducedMotion();

    /* Starts at the real number, not at `from`.
       This component renders on the server, so whatever it starts with is what
       ships in the HTML — and starting at zero meant the page stated "00
       events, 00 clubs" to anyone whose JavaScript had not run yet. Unanimated
       is fine; wrong is not, on a page whose whole point is that its figures
       are real. The client winds it back to `from` below, before the row is
       ever on screen. */
    const [displayValue, setDisplayValue] = useState(to);

    // animate() rather than useSpring(). The previous version passed `duration`
    // alongside `stiffness`/`damping` — two mutually exclusive ways to describe
    // a spring. It did animate, so this is an API-correctness cleanup rather
    // than a bug fix; animate() says plainly what is meant by `duration`.
    useEffect(() => {
        if (reduced) {
            setDisplayValue(to);
            return;
        }

        // Not reached yet: wind back to the start, unseen, so there is
        // something to count from when it is.
        if (!isInView) {
            setDisplayValue(from);
            return;
        }

        const controls = animate(from, to, {
            duration,
            delay,
            ease: 'easeOut',
            onUpdate: (latest) => setDisplayValue(Math.round(latest)),
        });

        return () => controls.stop();
    }, [isInView, from, to, duration, delay, reduced]);

    const text = pad
        ? String(displayValue).padStart(pad, '0')
        : displayValue.toLocaleString();

    /* A plain span, not a motion one.
       It used to fade itself in from opacity 0, which shipped that zero in the
       server HTML — so the figures were present but invisible until hydration.
       Whatever places this component is responsible for revealing it; here the
       Stat wrapper already does, and one reveal is enough. */
    return (
        <span ref={ref} className={className}>
            {text}{suffix}
        </span>
    );
}
