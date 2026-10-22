import type { CSSProperties, ReactNode } from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
    width?: string | number;
    height?: string | number;
    borderRadius?: string | number;
    /** On a dark or blue surface. */
    onDark?: boolean;
    style?: CSSProperties;
    className?: string;
}

/** One grey shape standing in for content that is still loading. */
export default function Skeleton({
    width = '100%',
    height = '1rem',
    borderRadius,
    onDark,
    style,
    className,
}: SkeletonProps) {
    return (
        <span
            aria-hidden="true"
            className={[styles.bone, onDark && styles.dark, className].filter(Boolean).join(' ')}
            style={{ width, height, borderRadius, ...style }}
        />
    );
}

/**
 * Wraps a loading screen: announced once to screen readers as `label`, and
 * held back for a moment so a fast page never flashes it.
 */
export function LoadingRegion({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
    return (
        <div role="status" aria-live="polite" className={[styles.region, className].filter(Boolean).join(' ')}>
            <span className={styles.label}>{label}</span>
            {children}
        </div>
    );
}
