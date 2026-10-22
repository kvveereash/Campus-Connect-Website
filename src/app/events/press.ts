/**
 * Campus Press — category ink system for the events surface.
 *
 * Following Resident Advisor's precedent, colour here is a lookup key rather
 * than decoration: each category owns one ink, and that ink appears only as the
 * category label, its rule, and the row's hover marker. It is never a page
 * background, a button fill, or an arbitrary accent.
 *
 * Art carries the brand lilac. #E0C0F8 cannot hold text on a paper canvas, so
 * the label uses a darkened tone of the same hue and the pure lilac is kept for
 * the one place it works — a fill with forest ink over it.
 */

export const CATEGORY_INK: Record<string, string> = {
    Technology: 'var(--press-technology)',
    Cultural: 'var(--press-cultural)',
    Social: 'var(--press-social)',
    Art: 'var(--press-art)',
    Sports: 'var(--press-sports)',
    Workshop: 'var(--press-workshop)',
    Hackathon: 'var(--press-hackathon)',
    Business: 'var(--press-business)',
};

/** Falls back to plain ink so an unknown category degrades quietly. */
export function inkFor(category?: string | null): string {
    return (category && CATEGORY_INK[category]) || 'var(--press-ink)';
}

/**
 * Events are read on Indian time. getDate() and friends use the runtime's
 * zone, which is UTC on the server and IST in the browser, so the same event
 * rendered a different day on each side of hydration. Pinning the zone makes
 * both agree, and agree with the poster.
 */
const IST = 'Asia/Kolkata';
const fmt = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-IN', { timeZone: IST, ...opts });
const MONTH = fmt({ month: 'short' });
const DAY = fmt({ day: '2-digit' });
const WEEKDAY = fmt({ weekday: 'short' });

export function dateParts(value: Date | string) {
    const d = new Date(value);
    if (isNaN(d.getTime())) return { month: '—', day: '--', weekday: '—' };
    return {
        month: MONTH.format(d),
        day: DAY.format(d),
        weekday: WEEKDAY.format(d),
    };
}

/**
 * Groups events by proximity rather than a flat date sort.
 *
 * Established listing practice is to show detail for what is near and
 * scannability for what is far — "this week" earns its own heading, anything
 * beyond the current month collapses into month headings.
 */
const IST_PARTS = new Intl.DateTimeFormat('en-US', {
    timeZone: IST, year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short',
});
const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const MONTH_LONG = fmt({ month: 'long' });
const MONTH_YEAR = fmt({ month: 'long', year: 'numeric' });

/** The calendar day an instant falls on in India, as a comparable day number. */
function istDay(d: Date) {
    const parts = Object.fromEntries(IST_PARTS.formatToParts(d).map((p) => [p.type, p.value]));
    const year = Number(parts.year);
    const month = Number(parts.month);
    const day = Number(parts.day);
    return { year, month, dayNumber: Date.UTC(year, month - 1, day) / 86_400_000, weekday: WEEKDAY_INDEX[parts.weekday] ?? 0 };
}

export function groupByProximity<T extends { date: Date | string }>(events: T[]) {
    /* Week and month boundaries are taken on Indian time, like dateParts
       above. They used the runtime's zone, which is UTC on the server and IST
       in the browser, so an event near midnight or a month's end landed under
       a different heading on each side and React reported a hydration error. */
    const today = istDay(new Date());
    const endOfWeek = today.dayNumber + (7 - today.weekday);

    const groups: { label: string; items: T[] }[] = [];

    for (const event of events) {
        const date = new Date(event.date);
        const d = istDay(date);

        let label: string;
        if (d.dayNumber <= endOfWeek) label = 'This week';
        else if (d.year === today.year && d.month === today.month) label = 'Later this month';
        else label = (d.year !== today.year ? MONTH_YEAR : MONTH_LONG).format(date);

        const existing = groups.find((g) => g.label === label);
        if (existing) existing.items.push(event);
        else groups.push({ label, items: [event] });
    }

    return groups;
}

/* Places people search by: one spelling per city, so "Bangalore" and
   "Bengaluru" campuses land under the same filter. */
const CITY_ALIASES: Record<string, string> = {
    bangalore: 'Bengaluru',
    bombay: 'Mumbai',
    'new delhi': 'Delhi',
    madras: 'Chennai',
    calcutta: 'Kolkata',
};

/** The city part of a college's "City, State" location, or null. */
export function cityOf(location?: string | null): string | null {
    const city = location?.split(',')[0]?.trim();
    if (!city) return null;
    return CITY_ALIASES[city.toLowerCase()] ?? city;
}

type Searchable = {
    title: string;
    venue: string;
    category: string;
    club?: { name: string } | null;
    hostCollege?: { name: string; location?: string } | null;
};

/**
 * True when every word of the query appears somewhere in the event's title,
 * venue, category, club, college or city. Word by word, so "hackathon pune"
 * finds a hackathon at a Pune college even though no single field has both.
 */
export function matchesSearch(event: Searchable, query: string): boolean {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return true;
    const haystack = [
        event.title,
        event.venue,
        event.category,
        event.club?.name,
        event.hostCollege?.name,
        event.hostCollege?.location,
        cityOf(event.hostCollege?.location),
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
    return words.every((w) => haystack.includes(w));
}

const IST_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
const HOUR = 60 * 60 * 1000;

/**
 * "Happening now", "Starts in 40 min", "In 3 hours", "Today", "Tomorrow",
 * or null when a date says it better. Days are counted in Indian time.
 * Events have no end time, so "now" lasts three hours from the start.
 */
export function timeLabel(start: Date | string, now: Date = new Date()): string | null {
    const s = new Date(start);
    const diff = s.getTime() - now.getTime();
    if (diff <= 0) return diff > -3 * HOUR ? 'Happening now' : null;
    if (diff < HOUR) return `Starts in ${Math.max(1, Math.round(diff / 60000))} min`;
    if (diff < 6 * HOUR) {
        const hours = Math.round(diff / HOUR);
        return `In ${hours} hour${hours === 1 ? '' : 's'}`;
    }
    const day = IST_DAY.format(s);
    if (day === IST_DAY.format(now)) return 'Today';
    if (day === IST_DAY.format(new Date(now.getTime() + 24 * HOUR))) return 'Tomorrow';
    return null;
}
