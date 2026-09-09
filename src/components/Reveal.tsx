'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

interface Props {
    children: ReactNode;
    /** Seconds to hold before starting — for staggering siblings by hand. */
    delay?: number;
    /** 'up' is the default lift; 'none' fades without moving. */
    from?: 'up' | 'none';
    className?: string;
}

/**
 * Reveals its children when they scroll into view.
 *
 * A client component so that server-rendered pages — /about, the club
 * detail page — can use it without becoming client components themselves.
 *
 * Two deliberate constraints:
 *
 * Only ever used below the fold. framer-motion writes its `initial` state
 * into the server HTML, so anything wrapped in this ships invisible until
 * React hydrates. That is the bug that made every page on this site arrive
 * blank until its JavaScript loaded (fixed in f6ac9de by moving the page
 * entrance to CSS). Below the fold the trade is fine — nobody sees it before
 * hydration — but a masthead must never be wrapped in this.
 *
 * `once: true`, so a section reveals the first time it is reached and then
 * stays put. Re-animating on every pass turns a long page into a flicker.
 */
export default function Reveal({ children, delay = 0, from = 'up', className }: Props) {
    const reduced = useReducedMotion();

    if (reduced) return <div className={className}>{children}</div>;

    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, y: from === 'up' ? 22 : 0 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-70px' }}
            transition={{
                duration: 1.05,
                delay,
                // The system's glide: quick to leave, a long settle.
                ease: [0.19, 1, 0.22, 1],
            }}
        >
            {children}
        </motion.div>
    );
}
