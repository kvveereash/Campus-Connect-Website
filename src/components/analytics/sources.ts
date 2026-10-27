/*
 * Where a visit to an event page came from. Pure functions, no database, so
 * the browser beacon, the share button and the server all agree on the same
 * list. The server side (recording and reading the counts) is in
 * src/lib/analytics.ts, which re-exports everything here.
 */

export const SOURCES = ['board', 'fest', 'whatsapp', 'share', 'calendar', 'embed', 'digest', 'search', 'direct', 'other'] as const;

export type Source = (typeof SOURCES)[number];

const KNOWN = new Set<string>(SOURCES);

/* Spellings people (and older links) use for the same place. */
const ALIASES: Record<string, Source> = {
    wa: 'whatsapp',
    ics: 'calendar',
    gcal: 'calendar',
    widget: 'embed',
    email: 'digest',
    newsletter: 'digest',
};

export const isSource = (value: unknown): value is Source => typeof value === 'string' && KNOWN.has(value);

/**
 * Any value to a known source. Missing or blank means the person came
 * straight here; anything unrecognised is "other" rather than a new bucket,
 * so a stray ?ref= cannot add rows to an organiser's table.
 */
export function normaliseSource(raw: unknown): Source {
    if (typeof raw !== 'string') return 'direct';
    const value = raw.trim().toLowerCase();
    if (!value) return 'direct';
    if (KNOWN.has(value)) return value as Source;
    return ALIASES[value] ?? 'other';
}

/**
 * The source a referrer stands for. `siteHost` is this site's host, so a
 * referrer from Campus Connect itself can be told apart from another site.
 * Inside the site, the fest pages and search are their own sources; every
 * other page (the board, the home page, a club) counts as the board.
 */
export function sourceFromReferrer(referrer: string | null | undefined, siteHost: string): Source {
    if (!referrer) return 'direct';
    let url: URL;
    try {
        url = new URL(referrer);
    } catch {
        return 'other';
    }
    const host = url.hostname.toLowerCase();

    if (url.host.toLowerCase() === siteHost.toLowerCase()) {
        if (url.pathname.startsWith('/fests')) return 'fest';
        if (url.pathname.startsWith('/search')) return 'search';
        return 'board';
    }
    if (host === 'wa.me' || host.endsWith('whatsapp.com') || host.endsWith('whatsapp.net')) return 'whatsapp';
    if (/(^|\.)(google|bing|duckduckgo|yahoo|yandex|ecosia)\./.test(host)) return 'search';
    return 'other';
}

/**
 * The source of this visit: an explicit ?ref= wins (our own links set it),
 * then the referrer.
 */
export function resolveSource(ref: string | null | undefined, referrer: string | null | undefined, siteHost: string): Source {
    if (ref && ref.trim()) return normaliseSource(ref);
    return sourceFromReferrer(referrer, siteHost);
}

/** `path` (or a full URL) with ?ref=<source> added, keeping any query or #fragment. */
export function withRef(path: string, source: Source): string {
    const cut = path.indexOf('#');
    const base = cut === -1 ? path : path.slice(0, cut);
    const hash = cut === -1 ? '' : path.slice(cut);
    return `${base}${base.includes('?') ? '&' : '?'}ref=${source}${hash}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;
/* India has one zone and no daylight saving, so IST is always UTC+5:30 and
   the Indian day can be worked out with arithmetic, the same on the server
   and in every browser whatever its own zone. */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** YYYY-MM-DD of the Indian calendar day an instant falls on. */
export function istDayKey(value: Date | number = Date.now()): string {
    return new Date(new Date(value).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** The Indian day `daysAgo` days before the one `now` falls on, as YYYY-MM-DD. */
export function istDayKeyDaysAgo(daysAgo: number, now: Date | number = Date.now()): string {
    return istDayKey(new Date(now).getTime() - daysAgo * DAY_MS);
}
