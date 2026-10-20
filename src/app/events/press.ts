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
export function groupByProximity<T extends { date: Date | string }>(events: T[]) {
    const now = new Date();

    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const groups: { label: string; items: T[] }[] = [];

    for (const event of events) {
        const d = new Date(event.date);

        let label: string;
        if (d <= endOfWeek) label = 'This week';
        else if (d <= endOfMonth) label = 'Later this month';
        else {
            label = d.toLocaleDateString('en-US', {
                month: 'long',
                ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
            });
        }

        const existing = groups.find((g) => g.label === label);
        if (existing) existing.items.push(event);
        else groups.push({ label, items: [event] });
    }

    return groups;
}
