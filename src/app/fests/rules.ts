import { formatIST } from '@/lib/format';

/*
 * The rules a fest follows, kept free of the database so the form, the
 * server actions and the tests all read the same ones.
 *
 * A fest is a run of whole days in India. Its dates travel as 'YYYY-MM-DD'
 * calendar days and are stored as the first and last instant of those days
 * in IST, so "happening now" is a plain comparison and a fest that ends on
 * the 15th is still on until midnight there, wherever the server runs.
 */

export const FEST_LIMITS = {
    NAME_MIN: 3,
    NAME_MAX: 80,
    TAGLINE_MAX: 120,
    DESCRIPTION_MIN: 20,
    DESCRIPTION_MAX: 2000,
    MAX_DAYS: 14,
} as const;

/** The unstable_cache tag every fest read carries; one fest also has its own. */
export const FESTS_TAG = 'fests';
export const festTag = (id: string) => `fest-${id}`;

const DAY_MS = 86_400_000;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

// en-CA formats as YYYY-MM-DD. This is a machine key for grouping and for
// <input type="date">, never shown as text, so formatIST is not the tool.
const IST_KEY = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

/** The IST calendar day an instant falls on, as 'YYYY-MM-DD'. */
export function istDateKey(value: Date | string): string {
    return IST_KEY.format(new Date(value));
}

/** Days since 1970 for a 'YYYY-MM-DD' key, or NaN when it is not a real date. */
function dayNumber(key: string): number {
    if (!DATE_KEY.test(key)) return NaN;
    const [y, m, d] = key.split('-').map(Number);
    const ms = Date.UTC(y, m - 1, d);
    const back = new Date(ms);
    // Rejects 2027-02-30, which Date.UTC would quietly roll into March.
    if (back.getUTCFullYear() !== y || back.getUTCMonth() !== m - 1 || back.getUTCDate() !== d) return NaN;
    return ms / DAY_MS;
}

/** The first instant of an IST calendar day. */
export function festDayStart(key: string): Date {
    return new Date(`${key}T00:00:00.000+05:30`);
}

/** The last instant of an IST calendar day. */
export function festDayEnd(key: string): Date {
    return new Date(`${key}T23:59:59.999+05:30`);
}

/**
 * What is wrong with a pair of fest dates, in words for the form, or null.
 * A new fest may not be over already; an existing one may be corrected after
 * it ends (a typo in last year's fest is still worth fixing).
 */
export function checkFestDates(
    startKey: string,
    endKey: string,
    { isNew, now = new Date() }: { isNew: boolean; now?: Date }
): string | null {
    const start = dayNumber(startKey);
    const end = dayNumber(endKey);
    if (Number.isNaN(start)) return 'Pick the day the fest starts.';
    if (Number.isNaN(end)) return 'Pick the day the fest ends.';
    if (end < start) return 'The last day cannot come before the first day.';
    if (end - start + 1 > FEST_LIMITS.MAX_DAYS) {
        return `A fest can run for at most ${FEST_LIMITS.MAX_DAYS} days. Shorten the dates or split it in two.`;
    }
    if (isNew && end < dayNumber(istDateKey(now))) {
        return 'Those dates are over. Pick days from today onwards.';
    }
    return null;
}

/** How many calendar days a fest covers, counting both ends. */
export function festLength(start: Date | string, end: Date | string): number {
    return dayNumber(istDateKey(end)) - dayNumber(istDateKey(start)) + 1;
}

export type FestPhase = 'now' | 'upcoming' | 'ended';

export function festPhase(start: Date | string, end: Date | string, now: Date = new Date()): FestPhase {
    if (new Date(end).getTime() < now.getTime()) return 'ended';
    if (new Date(start).getTime() > now.getTime()) return 'upcoming';
    return 'now';
}

/**
 * "13–15 Feb 2027", "30 Jan – 2 Feb 2027", or one day on its own. Short
 * months, no weekday: it sits in mono labels and on cards.
 */
export function festDateRange(start: Date | string, end: Date | string): string {
    const full: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    const startKey = istDateKey(start);
    const endKey = istDateKey(end);
    if (startKey === endKey) return formatIST(start, full);
    const sameYear = startKey.slice(0, 4) === endKey.slice(0, 4);
    const sameMonth = sameYear && startKey.slice(5, 7) === endKey.slice(5, 7);
    if (sameMonth) return `${formatIST(start, { day: 'numeric' })}–${formatIST(end, full)}`;
    if (sameYear) return `${formatIST(start, { day: 'numeric', month: 'short' })} – ${formatIST(end, full)}`;
    return `${formatIST(start, full)} – ${formatIST(end, full)}`;
}

/**
 * Who may edit a fest and attach events to it: whoever started it, an admin
 * of its club, or a site admin. The club check is passed in, so this stays
 * free of the database.
 */
export function mayManageFest({
    role,
    userId,
    creatorId,
    isClubAdmin,
}: {
    role: string;
    userId: string;
    creatorId: string | null;
    isClubAdmin: boolean;
}): boolean {
    return role === 'ADMIN' || (creatorId !== null && creatorId === userId) || isClubAdmin;
}

export interface TimetableDay<T> {
    key: string;
    /** "Day 2" when the day falls inside the fest's dates, otherwise null. */
    dayLabel: string | null;
    /** "Friday, 13 February" */
    title: string;
    items: T[];
}

/**
 * Events grouped by the IST calendar day they start on, days in order and
 * events in order of start time within each. An event set outside the
 * fest's own dates (a warm-up the evening before) still gets its own day,
 * just without a "Day N".
 */
export function groupTimetable<T extends { date: Date | string }>(
    events: T[],
    festStart: Date | string,
    festEnd: Date | string
): TimetableDay<T>[] {
    const first = dayNumber(istDateKey(festStart));
    const last = dayNumber(istDateKey(festEnd));
    const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const days: TimetableDay<T>[] = [];
    for (const event of sorted) {
        const key = istDateKey(event.date);
        let day = days.find((d) => d.key === key);
        if (!day) {
            const n = dayNumber(key);
            day = {
                key,
                dayLabel: n >= first && n <= last ? `Day ${n - first + 1}` : null,
                title: formatIST(event.date, { weekday: 'long', day: 'numeric', month: 'long' }),
                items: [],
            };
            days.push(day);
        }
        day.items.push(event);
    }
    return days;
}
