import { cityOf, matchesSearch } from '@/app/events/press';

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
