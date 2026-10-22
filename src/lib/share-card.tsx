import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { SITE_URL } from '@/lib/site';

/*
 * The picture a link unfurls into on WhatsApp, LinkedIn, X and Slack: a notice
 * pinned to the board. Satori draws it, so the CSS here is its subset (every
 * box with more than one child is flex) and the colours are literal: custom
 * properties do not exist in this renderer. They are the globals.css tokens.
 */

export const SHARE_SIZE = { width: 1200, height: 630 };

const INK = '#111114'; // --color-obsidian
const CANVAS = '#f5f4f0'; // --color-canvas
const PAPER = '#ffffff'; // --color-paper
const FELT = '#5f5f68'; // --color-felt
const ASH = '#6c6c75'; // --color-ash
const ACCENT = '#2f3bff'; // --color-accent
const MARKER = '#ffe45c'; // --color-marker
const HAIRLINE = '#e2e0d8'; // --border-hairline

// The --press-* category marks.
const CATEGORY_COLOURS: Record<string, string> = {
    technology: '#2f3bff',
    tech: '#2f3bff',
    cultural: '#e8457e',
    social: '#c2410c',
    sports: '#12a150',
    workshop: '#f06a00',
    hackathon: '#7a3cff',
    business: '#0e8a96',
    art: '#c98a00',
    arts: '#c98a00',
};

function categoryColour(category: string) {
    return CATEGORY_COLOURS[category.trim().toLowerCase()] ?? INK;
}

export type ShareCardProps = {
    /** What this is: "Event", "Club", "College". Shown in the kicker. */
    kind: string;
    /** Shown after the kind with its colour square. */
    category?: string | null;
    title: string;
    /** The line under the title: plain lead-in, then the one spoken phrase. */
    lead?: string;
    accent?: string;
    /** Small print: date, venue, counts. Joined with middots. */
    meta?: string[];
    /** One highlighted fact (the price). The marker, once. */
    chip?: string;
    /** A photo path or URL; falls back to `initial` on a blue panel. */
    photo?: string | null;
    initial?: string;
    /** The home card: a larger title, and the lead set at title size. */
    hero?: boolean;
};

function clip(text: string, max: number) {
    const clean = text.replace(/\s+/g, ' ').trim();
    return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

function titleSize(title: string, hero: boolean) {
    // The home headline and its second line share this size; at 72 each
    // fits on one line of the 588px column.
    if (hero) return 72;
    if (title.length <= 14) return 92;
    if (title.length <= 28) return 76;
    if (title.length <= 46) return 62;
    return 52;
}

/* Fonts come from Google Fonts' CSS API, asked only for the characters this
   card uses, so each is a few kilobytes. With no user agent that API answers
   with TrueType, which Satori can read (it cannot read woff2). A failure only
   loses that face: the card falls back to the bundled sans. */
async function googleFont(family: string, text: string): Promise<ArrayBuffer | null> {
    if (!text.trim()) return null;
    try {
        const css = await fetch(
            `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`,
            { signal: AbortSignal.timeout(4000) }
        ).then((r) => r.text());
        const src = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
        if (!src) return null;
        const res = await fetch(src, { signal: AbortSignal.timeout(4000) });
        return res.ok ? await res.arrayBuffer() : null;
    } catch {
        return null;
    }
}

const PHOTO_TYPES: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };
const MAX_PHOTO_BYTES = 6 * 1024 * 1024;

/* Only hosts the site already serves images from. A thumbnail is text an
   event's creator typed, so fetching any URL would let them point our server
   at internal addresses. */
function allowedRemote(url: URL) {
    if (url.protocol !== 'https:') return false;
    if (url.hostname === 'images.unsplash.com' || url.origin === SITE_URL) return true;
    try {
        return !!process.env.SUPABASE_URL && url.hostname === new URL(process.env.SUPABASE_URL).hostname;
    } catch {
        return false;
    }
}

async function fetchPhoto(url: URL): Promise<string | null> {
    if (!allowedRemote(url)) return null;
    // Unsplash picks WebP when it can, which Satori cannot draw.
    if (url.hostname === 'images.unsplash.com') {
        url.searchParams.set('fm', 'jpg');
        url.searchParams.set('w', '900');
    }
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const type = res.headers.get('content-type')?.split(';')[0] ?? '';
    if (!res.ok || !Object.values(PHOTO_TYPES).includes(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_PHOTO_BYTES) return null;
    return `data:${type};base64,${buf.toString('base64')}`;
}

/** The photo as a data URL, or null when it is missing, too big or a format Satori cannot draw. */
async function loadPhoto(src: string | null | undefined): Promise<string | null> {
    if (!src) return null;
    try {
        if (src.startsWith('/') && !src.startsWith('//')) {
            const type = PHOTO_TYPES[path.extname(src.split('?')[0]).toLowerCase()];
            if (!type) return null;
            // Read from disk where public/ ships with the server (local and
            // `next start`); on Netlify it is on the CDN instead, so fetch it.
            const publicDir = path.join(process.cwd(), 'public');
            const file = path.join(publicDir, path.normalize(src.split('?')[0]));
            if (file.startsWith(publicDir + path.sep)) {
                try {
                    const buf = await readFile(file);
                    return `data:${type};base64,${buf.toString('base64')}`;
                } catch {
                    // fall through to the CDN
                }
            }
            return await fetchPhoto(new URL(src, SITE_URL));
        }
        return await fetchPhoto(new URL(src));
    } catch {
        return null;
    }
}

export async function renderShareCard(props: ShareCardProps) {
    const hero = !!props.hero;
    const title = clip(props.title, hero ? 40 : 72);
    const kicker = [props.kind, props.category].filter(Boolean).join(' · ').toUpperCase();
    const meta = (props.meta ?? []).filter(Boolean).map((m) => clip(m, 48).toUpperCase());
    const initial = (props.initial ?? props.title).trim().charAt(0).toUpperCase() || 'C';
    const lead = props.lead ?? '';
    const accent = props.accent ? clip(props.accent, 40) : '';

    const display = `Campus Connect C${title}${initial}${hero ? lead : ''}`;
    const [displayFont, serifFont, monoFont, leadFont, photo] = await Promise.all([
        googleFont('Bricolage+Grotesque:wght@700', display),
        googleFont('Instrument+Serif:ital@1', accent),
        googleFont('Geist+Mono:wght@500', `${kicker}${meta.join('')}${props.chip ?? ''} ·`),
        hero ? Promise.resolve(null) : googleFont('Bricolage+Grotesque:wght@500', lead),
        loadPhoto(props.photo),
    ]);

    const fonts = [
        displayFont && { name: 'Display', data: displayFont, weight: 700 as const, style: 'normal' as const },
        leadFont && { name: 'Display', data: leadFont, weight: 500 as const, style: 'normal' as const },
        serifFont && { name: 'Serif', data: serifFont, weight: 400 as const, style: 'italic' as const },
        monoFont && { name: 'Mono', data: monoFont, weight: 500 as const, style: 'normal' as const },
    ].filter((f): f is NonNullable<typeof f> => !!f);

    const size = titleSize(title, hero);
    // A long college name drops a size so "at" stays on the same line.
    const subSize = hero ? size : accent.length > 22 ? 36 : 44;

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    padding: '56px 64px',
                    gap: 56,
                    backgroundColor: CANVAS,
                    fontFamily: 'Display',
                    color: INK,
                }}
            >
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: 12,
                                backgroundColor: ACCENT,
                                color: PAPER,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 28,
                                fontWeight: 700,
                            }}
                        >
                            C
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.6 }}>Campus Connect</div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                fontFamily: 'Mono',
                                fontSize: 20,
                                letterSpacing: 2,
                                color: ASH,
                                marginBottom: 22,
                            }}
                        >
                            {props.category ? (
                                <div style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: categoryColour(props.category) }} />
                            ) : null}
                            <div>{kicker}</div>
                        </div>
                        <div
                            style={{
                                fontSize: size,
                                fontWeight: 700,
                                lineHeight: 1,
                                letterSpacing: -size * 0.035,
                            }}
                        >
                            {title}
                        </div>
                        {lead || accent ? (
                            <div
                                style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    alignItems: 'baseline',
                                    marginTop: hero ? 4 : 18,
                                    fontSize: subSize,
                                    lineHeight: 1.05,
                                }}
                            >
                                {lead ? (
                                    <span
                                        style={{
                                            fontWeight: hero ? 700 : 500,
                                            color: hero ? INK : FELT,
                                            letterSpacing: -subSize * (hero ? 0.035 : 0.02),
                                            marginRight: hero ? 22 : 12,
                                        }}
                                    >
                                        {lead}
                                    </span>
                                ) : null}
                                {accent ? (
                                    <span
                                        style={{
                                            fontFamily: 'Serif',
                                            fontStyle: 'italic',
                                            color: ACCENT,
                                            fontSize: subSize * 1.08,
                                        }}
                                    >
                                        {accent}
                                    </span>
                                ) : null}
                            </div>
                        ) : null}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 18, minHeight: 44 }}>
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                                fontFamily: 'Mono',
                                fontSize: 21,
                                letterSpacing: 1.5,
                                color: FELT,
                                flexShrink: 1,
                                minWidth: 0,
                            }}
                        >
                            {meta.map((line) => (
                                <div key={line}>{line}</div>
                            ))}
                        </div>
                        {props.chip ? (
                            <div
                                style={{
                                    display: 'flex',
                                    padding: '10px 20px',
                                    borderRadius: 999,
                                    backgroundColor: MARKER,
                                    fontFamily: 'Mono',
                                    fontSize: 22,
                                    letterSpacing: 1.5,
                                    marginLeft: 'auto',
                                    flexShrink: 0,
                                }}
                            >
                                {props.chip.toUpperCase()}
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* The notice itself: a photo on white card, pinned slightly askew. */}
                <div
                    style={{
                        width: 420,
                        height: 518,
                        flexShrink: 0,
                        display: 'flex',
                        padding: 14,
                        backgroundColor: PAPER,
                        border: `1px solid ${HAIRLINE}`,
                        borderRadius: 24,
                        boxShadow: '0 18px 40px rgba(17, 17, 20, 0.12)',
                        transform: 'rotate(2.5deg)',
                    }}
                >
                    {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element -- Satori draws plain <img>; next/image does not exist here
                        <img
                            src={photo}
                            alt=""
                            width={392}
                            height={490}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 14 }}
                        />
                    ) : (
                        <div
                            style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: 14,
                                backgroundColor: ACCENT,
                                color: PAPER,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 260,
                                fontWeight: 700,
                                letterSpacing: -8,
                            }}
                        >
                            {initial}
                        </div>
                    )}
                </div>
            </div>
        ),
        { ...SHARE_SIZE, fonts }
    );
}

/** The site's own card: the home page headline. Also used when a link points at something that is not public. */
export function renderSiteCard() {
    return renderShareCard({
        kind: 'The student noticeboard',
        title: 'Find what’s on.',
        lead: 'Find',
        accent: 'your people.',
        meta: ['Events, clubs and teammates', 'across Indian colleges'],
        photo: '/images/campus/fest-confetti.jpg',
        hero: true,
    });
}
