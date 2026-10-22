/**
 * @jest-environment node
 */
import { googleCalendarUrl, icsFile } from '../calendar';

const event = {
    id: 'cmevent1',
    title: 'CTF Night; bring a laptop, charger',
    description: 'Line one\nLine two with a backslash \\ in it',
    venue: 'Lab 3',
    collegeName: 'KGISL',
    // 6:30 pm in India.
    date: '2026-12-12T13:00:00.000Z',
};

describe('icsFile', () => {
    const ics = icsFile(event);
    const unfolded = ics.replace(/\r\n /g, '');

    it('is a calendar with CRLF line endings', () => {
        expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
        expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
        expect(ics.replace(/\r\n/g, '')).not.toContain('\n');
    });

    it('starts at the event time in UTC and assumes two hours', () => {
        expect(unfolded).toContain('DTSTART:20261212T130000Z');
        expect(unfolded).toContain('DTEND:20261212T150000Z');
    });

    it('escapes commas, semicolons, backslashes and newlines in text', () => {
        expect(unfolded).toContain('SUMMARY:CTF Night\\; bring a laptop\\, charger');
        expect(unfolded).toContain('Line one\\nLine two with a backslash \\\\ in it');
    });

    it('cannot be made to start a new property with a lone carriage return', () => {
        const smuggled = icsFile({ ...event, title: 'Talk\rBEGIN:VALARM\rACTION:DISPLAY\u0007' });
        const lines = smuggled.replace(/\r\n /g, '').split('\r\n');
        expect(smuggled.replace(/\r\n/g, '')).not.toMatch(/[\r\x00-\x08\x0b-\x1f\x7f]/);
        expect(lines).toContain('SUMMARY:Talk\\nBEGIN:VALARM\\nACTION:DISPLAY');
        expect(lines.filter((l) => l === 'BEGIN:VALARM')).toHaveLength(1);
    });

    it('folds every line to 75 bytes', () => {
        for (const line of ics.split('\r\n')) {
            expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
        }
    });

    it('reminds a day before', () => {
        expect(ics).toContain('TRIGGER:-P1D');
    });
});

describe('googleCalendarUrl', () => {
    it('carries the title, the two-hour span and Indian time zone', () => {
        const url = new URL(googleCalendarUrl(event));
        expect(url.hostname).toBe('calendar.google.com');
        expect(url.searchParams.get('text')).toBe(event.title);
        expect(url.searchParams.get('dates')).toBe('20261212T130000Z/20261212T150000Z');
        expect(url.searchParams.get('ctz')).toBe('Asia/Kolkata');
        expect(url.searchParams.get('location')).toBe('Lab 3, KGISL');
    });
});
