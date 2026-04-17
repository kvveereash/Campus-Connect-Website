'use client';

import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

/**
 * Custom ring cursor — shows a small dot and a larger ring that follows with spring physics.
 * Only renders on non-touch devices. Hides during scroll.
 */
export default function CustomCursor() {
    const [isVisible, setIsVisible] = useState(false);
    const [isHovering, setIsHovering] = useState(false);

    const cursorX = useMotionValue(-100);
    const cursorY = useMotionValue(-100);

    const springX = useSpring(cursorX, { stiffness: 300, damping: 28 });
    const springY = useSpring(cursorY, { stiffness: 300, damping: 28 });

    useEffect(() => {
        // Only show on non-touch devices
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (isTouchDevice) return;

        setIsVisible(true);

        const moveCursor = (e: MouseEvent) => {
            cursorX.set(e.clientX);
            cursorY.set(e.clientY);
        };

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest('a, button, [role="button"], input, textarea, select')) {
                setIsHovering(true);
            } else {
                setIsHovering(false);
            }
        };

        window.addEventListener('mousemove', moveCursor);
        window.addEventListener('mouseover', handleMouseOver);

        return () => {
            window.removeEventListener('mousemove', moveCursor);
            window.removeEventListener('mouseover', handleMouseOver);
        };
    }, [cursorX, cursorY]);

    if (!isVisible) return null;

    return (
        <>
            {/* Dot */}
            <motion.div
                style={{
                    position: 'fixed',
                    left: cursorX,
                    top: cursorY,
                    borderRadius: '50%',
                    pointerEvents: 'none',
                    zIndex: 10001,
                    transform: 'translate(-50%, -50%)',
                    mixBlendMode: 'difference',
                }}
                animate={{
                    width: isHovering ? 0 : 8,
                    height: isHovering ? 0 : 8,
                    backgroundColor: 'white',
                    opacity: isHovering ? 0 : 1
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            />

            {/* Ring */}
            <motion.div
                style={{
                    position: 'fixed',
                    left: springX,
                    top: springY,
                    borderRadius: '50%',
                    pointerEvents: 'none',
                    zIndex: 10000,
                    transform: 'translate(-50%, -50%)',
                    mixBlendMode: 'difference',
                }}
                animate={{
                    width: isHovering ? 64 : 40,
                    height: isHovering ? 64 : 40,
                    opacity: isHovering ? 1 : 0.4,
                    border: isHovering ? '0px solid white' : '1.5px solid white',
                    backgroundColor: isHovering ? 'white' : 'transparent',
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            />
        </>
    );
}
