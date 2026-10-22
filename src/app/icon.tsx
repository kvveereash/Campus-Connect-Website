import { ImageResponse } from 'next/og';

/*
 * App icons for the home screen, drawn from the navbar's mark (two dots joined
 * by a curve) so nothing is a binary in the repo. "any" is the rounded tile;
 * "maskable" fills the square and keeps the mark inside the 80% safe zone,
 * because Android crops it to its own shape.
 */

const INK = '#111114'; // --color-obsidian
const MARKER = '#ffe45c'; // --color-marker

const ICONS = {
    '192': { size: 192, maskable: false },
    '512': { size: 512, maskable: false },
    maskable: { size: 512, maskable: true },
} as const;

export function generateImageMetadata() {
    return Object.entries(ICONS).map(([id, { size }]) => ({ id, size: { width: size, height: size }, contentType: 'image/png' }));
}

export default async function Icon({ id }: { id: Promise<string> }) {
    const icon = ICONS[(await id) as keyof typeof ICONS] ?? ICONS['192'];
    const mark = Math.round(icon.size * (icon.maskable ? 0.5 : 0.62));

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: INK,
                    borderRadius: icon.maskable ? 0 : icon.size * 0.22,
                }}
            >
                <svg viewBox="0 0 24 24" width={mark} height={mark}>
                    <circle cx="6" cy="7" r="3" fill={MARKER} />
                    <circle cx="18" cy="17" r="3" fill={MARKER} />
                    <path d="M8.5 8.5 C 13 9, 11 15, 15.5 15.5" stroke={MARKER} strokeWidth="2" fill="none" strokeLinecap="round" />
                </svg>
            </div>
        ),
        { width: icon.size, height: icon.size },
    );
}
