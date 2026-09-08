'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView, motion, animate } from 'framer-motion';

interface AnimatedCounterProps {
    from?: number;
    to: number;
    duration?: number;
    suffix?: string;
    className?: string;
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
}: AnimatedCounterProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const isInView = useInView(ref, { once: true, margin: '-80px' });
    const [displayValue, setDisplayValue] = useState(from);

    // animate() rather than useSpring(). The previous version passed `duration`
    // alongside `stiffness`/`damping` — two mutually exclusive ways to describe
    // a spring. It did animate, so this is an API-correctness cleanup rather
    // than a bug fix; animate() says plainly what is meant by `duration`.
    useEffect(() => {
        if (!isInView) return;

        const controls = animate(from, to, {
            duration,
            ease: 'easeOut',
            onUpdate: (latest) => setDisplayValue(Math.round(latest)),
        });

        return () => controls.stop();
    }, [isInView, from, to, duration]);

    return (
        <motion.span
            ref={ref}
            className={className}
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
        >
            {displayValue.toLocaleString()}{suffix}
        </motion.span>
    );
}
