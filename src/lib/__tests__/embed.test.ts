/**
 * @jest-environment node
 */

const mockCollege = jest.fn();
const mockClub = jest.fn();
const mockEvents = jest.fn();
jest.mock('@/lib/db', () => ({
    __esModule: true,
    default: {
        college: { findUnique: (...a: unknown[]) => mockCollege(...a) },
        club: { findFirst: (...a: unknown[]) => mockClub(...a) },
        event: { findMany: (...a: unknown[]) => mockEvents(...a) },
    },
}));

import { CATEGORY_INK } from '@/app/events/press';
import { CATEGORY_HEX, EMBED_LIMIT, embedResponse, escapeHtml, loadEmbedData, renderEmbed, themeFrom, type EmbedData } from '../embed';

const NOW = new Date('2026-10-27T06:00:00Z');

const EVENT = {
    id: 'ev1',
    title: 'Robotics night',
    date: new Date('2026-11-02T13:00:00Z'), // 6:30 pm in India
    venue: 'Main hall',
    category: 'Technology',
    price: 0,
};

function data(overrides: Partial<EmbedData> = {}): EmbedData {
    return { kind: 'college', id: 'col1', name: 'IIT Madras', events: [EVENT], ...overrides };
}

beforeEach(() => {
    mockCollege.mockReset();
    mockClub.mockReset();
    mockEvents.mockReset();
});

describe('escapeHtml', () => {
    it('escapes every character that can open a tag or close an attribute', () => {
        expect(escapeHtml(`<script>alert("x")</script> & 'y'`)).toBe(
            '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;',
        );
    });

    it('leaves ordinary text, including Indian scripts and the rupee sign, alone', () => {
        expect(escapeHtml('तकनीकी उत्सव · ₹250')).toBe('तकनीकी उत्सव · ₹250');
    });

    it('escapes an ampersand once, not twice', () => {
        expect(escapeHtml('&amp;')).toBe('&amp;amp;');
    });
});

describe('renderEmbed', () => {
    it('never prints user text as markup', () => {
        const html = renderEmbed(
            data({
                name: '<img src=x onerror=alert(1)>',
                events: [{ ...EVENT, title: '"><script>alert(1)</script>', venue: "Hall 'B'", category: '<b>Odd</b>' }],
            }),
            'light',
            NOW,
        );
        expect(html).not.toContain('<img src=x');
        expect(html).not.toContain('<script>alert(1)</script>');
        expect(html).not.toContain('<b>Odd</b>');
        expect(html).toContain('&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
        expect(html).toContain('Hall &#39;B&#39;');
        // The only script is the height reporter.
        expect(html.match(/<script>/g)).toHaveLength(1);
        expect(html).toContain("type:'campus-connect:height'");
    });

    it('lists an event with its IST date and time, category square, price and a link back', () => {
        const html = renderEmbed(data({ events: [{ ...EVENT, price: 250 }] }), 'light', NOW);
        expect(html).toContain('Mon, 2 Nov');
        expect(html).toContain('6:30 pm');
        expect(html).toContain('style="background:#2f3bff"');
        expect(html).toContain('Technology');
        expect(html).toContain('₹250');
        expect(html).toContain('href="https://campusconnect2026.netlify.app/events/ev1?ref=embed" target="_blank" rel="noopener"');
        expect(html).toContain('Events on Campus Connect');
        expect(html).toContain('href="https://campusconnect2026.netlify.app/colleges/col1?ref=embed"');
    });

    it('says Free for a free event', () => {
        expect(renderEmbed(data(), 'light', NOW)).toContain('<span class="price">Free</span>');
    });

    it('shows the empty state, with a way to the board, when nothing is coming up', () => {
        const html = renderEmbed(data({ kind: 'club', id: 'club1', name: 'Drama society', events: [] }), 'light', NOW);
        expect(html).toContain('Nothing coming up');
        expect(html).toContain('When Drama society posts an event, it will show here.');
        expect(html).toContain('href="https://campusconnect2026.netlify.app/events?ref=embed"');
        expect(html).not.toContain('<ol');
        expect(html).toContain('href="https://campusconnect2026.netlify.app/clubs/club1?ref=embed"');
    });

    it('switches to the dark theme on the root element', () => {
        expect(renderEmbed(data(), 'light', NOW)).toContain('<html lang="en-IN" class="light">');
        expect(renderEmbed(data(), 'dark', NOW)).toContain('<html lang="en-IN" class="dark">');
    });
});

describe('themeFrom', () => {
    it('is dark only for ?theme=dark', () => {
        expect(themeFrom('https://x.test/embed/college/a?theme=dark')).toBe('dark');
        expect(themeFrom('https://x.test/embed/college/a?theme=DARK')).toBe('light');
        expect(themeFrom('https://x.test/embed/college/a')).toBe('light');
    });
});

describe('CATEGORY_HEX', () => {
    it('has a colour for every category the board has an ink for', () => {
        expect(Object.keys(CATEGORY_HEX).sort()).toEqual(Object.keys(CATEGORY_INK).sort());
    });
});

describe('loadEmbedData', () => {
    it('asks only for verified, not deleted, upcoming events of the college, soonest first', async () => {
        mockCollege.mockResolvedValue({ id: 'col1', name: 'IIT Madras' });
        mockEvents.mockResolvedValue([EVENT]);

        const result = await loadEmbedData('college', 'col1', NOW);

        expect(result).toEqual({ kind: 'college', id: 'col1', name: 'IIT Madras', events: [EVENT] });
        expect(mockEvents).toHaveBeenCalledWith({
            where: { hostCollegeId: 'col1', verified: true, deletedAt: null, date: { gte: NOW } },
            orderBy: { date: 'asc' },
            take: EMBED_LIMIT,
            select: { id: true, title: true, date: true, venue: true, category: true, price: true },
        });
        expect(mockCollege).toHaveBeenCalledWith({ where: { id: 'col1' }, select: { id: true, name: true } });
    });

    it('for a club, filters by club and skips a deleted club', async () => {
        mockClub.mockResolvedValue(null);
        mockEvents.mockResolvedValue([]);

        expect(await loadEmbedData('club', 'club1', NOW)).toBeNull();
        expect(mockClub).toHaveBeenCalledWith({ where: { id: 'club1', deletedAt: null }, select: { id: true, name: true } });
        expect(mockEvents).toHaveBeenCalledWith(
            expect.objectContaining({ where: { clubId: 'club1', verified: true, deletedAt: null, date: { gte: NOW } } }),
        );
    });
});

describe('embedResponse', () => {
    it('serves a cacheable HTML document', async () => {
        mockCollege.mockResolvedValue({ id: 'col1', name: 'IIT Madras' });
        mockEvents.mockResolvedValue([]);

        const res = await embedResponse('college', 'col1', 'https://x.test/embed/college/col1?theme=dark');

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8');
        expect(res.headers.get('cache-control')).toBe('public, s-maxage=300, stale-while-revalidate=600');
        expect(await res.text()).toContain('class="dark"');
    });

    it('answers an unknown id with a 404 page in the same style', async () => {
        mockCollege.mockResolvedValue(null);
        mockEvents.mockResolvedValue([]);

        const res = await embedResponse('college', 'nope', 'https://x.test/embed/college/nope');

        expect(res.status).toBe(404);
        expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8');
        expect(await res.text()).toContain('This college is not on Campus Connect');
    });

    it('does not query for an id that cannot be one', async () => {
        const res = await embedResponse('club', '<x>', 'https://x.test/embed/club/%3Cx%3E');
        expect(res.status).toBe(404);
        expect(mockClub).not.toHaveBeenCalled();
        expect(mockEvents).not.toHaveBeenCalled();
    });
});
