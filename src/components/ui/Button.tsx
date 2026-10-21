'use client';

import { ReactNode, useRef, type Ref } from 'react';
import Link from 'next/link';
import { motion, useSpring, useMotionValue, type HTMLMotionProps } from 'framer-motion';
import styles from './Button.module.css';

// Created once. Calling motion.create inside the component made a new
// component type on every render, so every button-link remounted each time.
const MotionLink = motion.create(Link);

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children' | 'ref'> {
    children?: ReactNode;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    fullWidth?: boolean;
    href?: string; // Support for Link
}

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className = '',
    disabled,
    href,
    ...props
}: ButtonProps) {
    const ref = useRef<HTMLButtonElement | HTMLAnchorElement>(null);

    // Magnetic states
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const springConfig = { stiffness: 150, damping: 15, mass: 0.1 };
    const springX = useSpring(x, springConfig);
    const springY = useSpring(y, springConfig);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!ref.current) return;
        const { clientX, clientY } = e;
        const { left, top, width, height } = ref.current.getBoundingClientRect();
        const centerX = left + width / 2;
        const centerY = top + height / 2;

        // Move max 10px towards cursor
        const moveX = (clientX - centerX) * 0.2;
        const moveY = (clientY - centerY) * 0.2;

        x.set(moveX);
        y.set(moveY);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    const combinedClassName = [
        styles.button,
        styles[variant],
        styles[size],
        fullWidth ? styles.fullWidth : '',
        className
    ].filter(Boolean).join(' ');

    const content = (
        <>
            {isLoading && <span className={styles.spinner} />}
            {!isLoading && leftIcon && <span className={styles.icon}>{leftIcon}</span>}
            {children}
            {!isLoading && rightIcon && <span className={styles.icon}>{rightIcon}</span>}
        </>
    );

    const shared = {
        className: combinedClassName,
        onMouseMove: handleMouseMove,
        onMouseLeave: handleMouseLeave,
        style: { x: springX, y: springY },
        whileTap: { scale: 0.96 },
    };

    // A link takes only what a link can use; the button props are for buttons.
    if (href) {
        return (
            <MotionLink ref={ref as Ref<HTMLAnchorElement>} href={href} {...shared}>
                {content}
            </MotionLink>
        );
    }

    return (
        <motion.button
            ref={ref as Ref<HTMLButtonElement>}
            {...shared}
            disabled={disabled || isLoading}
            {...props}
        >
            {content}
        </motion.button>
    );
}
