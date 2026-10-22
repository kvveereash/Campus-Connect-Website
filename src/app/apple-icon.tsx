import { ImageResponse } from 'next/og';

// iOS's home-screen icon. iOS rounds the corners itself, so this one is square.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

const INK = '#111114'; // --color-obsidian
const MARKER = '#ffe45c'; // --color-marker

export default function AppleIcon() {
    return new ImageResponse(
        (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: INK }}>
                <svg viewBox="0 0 24 24" width={110} height={110}>
                    <circle cx="6" cy="7" r="3" fill={MARKER} />
                    <circle cx="18" cy="17" r="3" fill={MARKER} />
                    <path d="M8.5 8.5 C 13 9, 11 15, 15.5 15.5" stroke={MARKER} strokeWidth="2" fill="none" strokeLinecap="round" />
                </svg>
            </div>
        ),
        size,
    );
}
