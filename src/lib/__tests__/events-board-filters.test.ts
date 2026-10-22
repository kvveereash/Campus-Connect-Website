import { collegeCoords } from '@/lib/college-coords';
import { cityOf, matchesSearch, timeLabel } from '@/app/events/press';

describe('cityOf', () => {
    it('takes the city from "City, State"', () => {
        expect(cityOf('Pune, Maharashtra')).toBe('Pune');
    });

    it('files old and new spellings under one city', () => {
        expect(cityOf('Bangalore, Karnataka')).toBe('Bengaluru');
        expect(cityOf('Bengaluru, Karnataka')).toBe('Bengaluru');
        expect(cityOf('New Delhi, Delhi')).toBe('Delhi');
    });

    it('is null without a location', () => {
        expect(cityOf(undefined)).toBeNull();
        expect(cityOf('  ')).toBeNull();
    });
});

describe('matchesSearch', () => {
    const event = {
        title: 'Hack the Monsoon',
        venue: 'Lecture Hall Complex',
        category: 'Hackathon',
        club: { name: 'CodeCraft Society' },
        hostCollege: { name: 'Indian Institute of Technology, Mumbai', location: 'Bombay, Maharashtra' },
    };

    it('matches any field, ignoring case', () => {
        expect(matchesSearch(event, 'monsoon')).toBe(true);
        expect(matchesSearch(event, 'codecraft')).toBe(true);
        expect(matchesSearch(event, 'LECTURE')).toBe(true);
    });

    it('needs every word, but each can come from a different field', () => {
        expect(matchesSearch(event, 'hackathon mumbai')).toBe(true);
        expect(matchesSearch(event, 'hackathon pune')).toBe(false);
    });

    it('finds a college by its city, including the current spelling', () => {
        expect(matchesSearch(event, 'maharashtra')).toBe(true);
        expect(matchesSearch(event, 'mumbai')).toBe(true);
    });

    it('matches everything for an empty query', () => {
        expect(matchesSearch(event, '   ')).toBe(true);
    });
});

describe('timeLabel', () => {
    // 22 Oct 2026, 2:00 pm in India.
    const now = new Date('2026-10-22T08:30:00Z');
    const at = (minutes: number) => new Date(now.getTime() + minutes * 60000);

    it('says an event is on for three hours after it starts', () => {
        expect(timeLabel(at(-10), now)).toBe('Happening now');
        expect(timeLabel(at(-179), now)).toBe('Happening now');
        expect(timeLabel(at(-181), now)).toBeNull();
    });

    it('counts down the last hour in minutes, then hours', () => {
        expect(timeLabel(at(40), now)).toBe('Starts in 40 min');
        expect(timeLabel(at(180), now)).toBe('In 3 hours');
        expect(timeLabel(at(75), now)).toBe('In 1 hour');
    });

    it('names today and tomorrow in Indian time', () => {
        expect(timeLabel(new Date('2026-10-22T17:00:00Z'), now)).toBe('Today'); // 10:30 pm IST
        expect(timeLabel(new Date('2026-10-22T19:00:00Z'), now)).toBe('Tomorrow'); // 12:30 am IST, 23rd
        expect(timeLabel(new Date('2026-10-24T08:30:00Z'), now)).toBeNull();
    });
});

describe('collegeCoords', () => {
    it('finds a college however its name is punctuated', () => {
        expect(collegeCoords('Indian Institute of Technology, Mumbai')).toEqual([19.1334, 72.9133]);
        expect(collegeCoords('BITS Pilani — Goa Campus')).toEqual([15.3911, 73.8782]);
        expect(collegeCoords('Delhi University — North Campus')).not.toBeNull();
    });

    it('has no pin for a college it does not know', () => {
        expect(collegeCoords('Apex University')).toBeNull();
        expect(collegeCoords(null)).toBeNull();
    });
});
