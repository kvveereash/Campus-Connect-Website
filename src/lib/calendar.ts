import { SITE_URL } from '@/lib/site';

/*
 * "Add to calendar" for an event: a Google Calendar link and an .ics file
 * (Apple Calendar, Outlook, anything else). Events have a start but no end
 * in the schema, so both assume two hours; the calendar entry is a reminder
 * to show up, not a promise about when it finishes.
 */

const ASSUMED_LENGTH_MS = 2 * 60 * 60 * 1000;

export type CalendarEvent = {
    id: string;
    title: string;
    description: string;
    venue: string;
    date: Date | string;
    collegeName: string;
};

/** 20261212T161900Z: the UTC form both formats take. */
function stamp(date: Date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function span(event: CalendarEvent) {
    const start = new Date(event.date);
    return { start, end: new Date(start.getTime() + ASSUMED_LENGTH_MS) };
}

const pageUrl = (event: CalendarEvent) => `${SITE_URL}/events/${event.id}`;

export function googleCalendarUrl(event: CalendarEvent) {
    const { start, end } = span(event);
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.title,
        dates: `${stamp(start)}/${stamp(end)}`,
        details: `${event.description.slice(0, 600)}\n\n${pageUrl(event)}`,
        location: `${event.venue}, ${event.collegeName}`,
        ctz: 'Asia/Kolkata',
    });
    return `https://calendar.google.com/calendar/render?${params}`;
}

/* RFC 5545 text: backslash, semicolon and comma are escaped, line breaks become
   \n. A lone \r counts as a break too, and other control characters are
   dropped: some calendar apps start a new line at a bare \r, which would let
   an organiser's title smuggle extra properties (an alarm, a URL) into the
   file. */
function icsText(value: string) {
    return value
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\r\n|\r|\n/g, '\\n')
        .replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '');
}

const bytes = (s: string) => new TextEncoder().encode(s).length;

/* Lines longer than 75 octets are folded: CRLF then a space. */
function fold(line: string) {
    const out: string[] = [];
    let rest = line;
    while (bytes(rest) > 75) {
        let cut = 75;
        while (bytes(rest.slice(0, cut)) > 75) cut--;
        out.push(rest.slice(0, cut));
        rest = ` ${rest.slice(cut)}`;
    }
    out.push(rest);
    return out.join('\r\n');
}

function vevent(event: CalendarEvent, now: Date) {
    const { start, end } = span(event);
    return [
        'BEGIN:VEVENT',
        `UID:${event.id}@campusconnect`,
        `DTSTAMP:${stamp(now)}`,
        `DTSTART:${stamp(start)}`,
        `DTEND:${stamp(end)}`,
        `SUMMARY:${icsText(event.title)}`,
        `DESCRIPTION:${icsText(`${event.description.slice(0, 1500)}\n\n${pageUrl(event)}`)}`,
        `LOCATION:${icsText(`${event.venue}, ${event.collegeName}`)}`,
        `URL:${pageUrl(event)}`,
        // A nudge the day before, the way the site's own reminder works.
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${icsText(event.title)}`,
        'TRIGGER:-P1D',
        'END:VALARM',
        'END:VEVENT',
    ];
}

/** A calendar of any number of events. `name` titles a subscribed feed in the calendar app. */
export function icsCalendar(events: CalendarEvent[], name?: string) {
    const now = new Date();
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Campus Connect//Events//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        ...(name
            ? [
                  `X-WR-CALNAME:${icsText(name)}`,
                  'X-WR-TIMEZONE:Asia/Kolkata',
                  // How often a subscribed calendar app should look again.
                  'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
                  'X-PUBLISHED-TTL:PT6H',
              ]
            : []),
        ...events.flatMap((event) => vevent(event, now)),
        'END:VCALENDAR',
    ];
    return `${lines.map(fold).join('\r\n')}\r\n`;
}

export const icsFile = (event: CalendarEvent) => icsCalendar([event]);
