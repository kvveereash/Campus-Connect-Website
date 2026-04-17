'use client';

interface SectionDividerProps {
    variant?: 'squiggle' | 'dots' | 'dashes';
    color?: string;
    className?: string;
}

/**
 * Hand-drawn editorial SVG divider between page sections.
 * Matches the editorial aesthetic of the site.
 */
export default function SectionDivider({
    variant = 'squiggle',
    color = 'var(--color-lilac, #E0C0F8)',
    className,
}: SectionDividerProps) {
    if (variant === 'dots') {
        return (
            <div
                className={className}
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '12px',
                    padding: '2rem 0',
                    opacity: 0.5,
                }}
            >
                {[0, 1, 2, 3, 4].map(i => (
                    <div
                        key={i}
                        style={{
                            width: i === 2 ? '8px' : '5px',
                            height: i === 2 ? '8px' : '5px',
                            borderRadius: '50%',
                            background: color,
                        }}
                    />
                ))}
            </div>
        );
    }

    if (variant === 'dashes') {
        return (
            <svg
                width="100%"
                height="20"
                viewBox="0 0 400 20"
                className={className}
                style={{ display: 'block', margin: '2rem auto', opacity: 0.4 }}
                preserveAspectRatio="none"
            >
                <line
                    x1="60"
                    y1="10"
                    x2="340"
                    y2="10"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeDasharray="8 6"
                    strokeLinecap="round"
                />
            </svg>
        );
    }

    // Default: squiggle
    return (
        <svg
            width="100%"
            height="24"
            viewBox="0 0 400 24"
            className={className}
            style={{ display: 'block', margin: '2rem auto', opacity: 0.4, maxWidth: '360px' }}
            preserveAspectRatio="none"
        >
            <path
                d="M20 12 Q 60 4, 100 12 T 180 12 T 260 12 T 340 12 T 380 12"
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
            />
        </svg>
    );
}
