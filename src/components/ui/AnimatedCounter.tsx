'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView, motion, useSpring, useMotionValue } from 'framer-motion';

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

    const motionValue = useMotionValue(from);
    const springValue = useSpring(motionValue, {
        stiffness: 50,
        damping: 20,
        duration: duration * 1000,
    });

    useEffect(() => {
        if (isInView) {
            motionValue.set(to);
        }
    }, [isInView, motionValue, to]);

    useEffect(() => {
        const unsubscribe = springValue.on('change', (latest) => {
            setDisplayValue(Math.round(latest));
        });
        return unsubscribe;
    }, [springValue]);

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
