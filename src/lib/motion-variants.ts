'use client';

import { Variants } from 'framer-motion';

// ─── Shared Reveal Animations ───────────────────────────────────────────────

/** Fade in + slide up — for individual items within a staggered group */
export const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
};

/** Fade in + slide from left */
export const fadeInLeft: Variants = {
    hidden: { opacity: 0, x: -24 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
};

/** Fade in + slide from right */
export const fadeInRight: Variants = {
    hidden: { opacity: 0, x: 24 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
};

/** Scale in — pops from slightly smaller */
export const scaleIn: Variants = {
    hidden: { opacity: 0, scale: 0.92 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
};

// ─── Container Animations (for staggering children) ──────────────────────────

/** Stagger children with 80ms delay */
export const staggerGrid: Variants = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.08 },
    },
};

/** Stagger children with slower 150ms delay (for fewer items) */
export const staggerSlow: Variants = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.15 },
    },
};

/** Stagger children with fast 50ms delay (for many items like list rows) */
export const staggerFast: Variants = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.05 },
    },
};

// ─── Interactive Variants ────────────────────────────────────────────────────

/** Magnetic button spring — use with whileHover/whileTap */
export const magneticButton = {
    hover: { scale: 1.03, transition: { type: 'spring' as const, stiffness: 400, damping: 17 } },
    tap: { scale: 0.97, transition: { type: 'spring' as const, stiffness: 400, damping: 17 } },
};

/** Card hover lift with spring physics */
export const cardHover = {
    hover: { y: -8, transition: { type: 'spring' as const, stiffness: 300, damping: 20 } },
};

/** 3D tilt — for retro-shadow cards */
export const tilt3D = {
    hover: {
        rotateX: -2,
        rotateY: 4,
        transition: { type: 'spring' as const, stiffness: 300, damping: 20 },
    },
};

// ─── Viewport Config ─────────────────────────────────────────────────────────

/** Standard viewport trigger — fires once, with 100px margin */
export const viewportOnce = { once: true, margin: '-80px' as const };
