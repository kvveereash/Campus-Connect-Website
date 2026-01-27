'use client';

import { CSSProperties } from 'react';

interface SkeletonProps {
    width?: string | number;
    height?: string | number;
    borderRadius?: string | number;
    style?: CSSProperties;
    className?: string;
}

export default function Skeleton({
    width = '100%',
    height = '1rem',
    borderRadius = '0.5rem',
    style,
    className
}: SkeletonProps) {
    return (
        <div
            className={className}
            style={{
                width,
                height,
                borderRadius,
                backgroundColor: 'var(--surface-color)',
                backgroundImage: 'linear-gradient(90deg, var(--surface-color) 0px, var(--border-color) 40px, var(--surface-color) 80px)',
                backgroundSize: '200% 100%',
                animation: 'skeleton-shimmer 1.5s infinite linear',
                ...style
            }}
        >
            <style jsx global>{`
                @keyframes skeleton-shimmer {
                    0% {
                        background-position: -200% 0;
                    }
                    100% {
                        background-position: 200% 0;
                    }
                }
            `}</style>
        </div>
    );
}
