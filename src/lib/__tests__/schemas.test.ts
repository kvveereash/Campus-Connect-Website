import {
    eventSchema,
    clubSchema,
    joinClubSchema,
    teamRequestSchema,
    reviewSchema,
    messageSchema,
    userProfileSchema,
    LIMITS,
} from '../schemas';

describe('Zod validation schemas', () => {
    // ── eventSchema ──

    describe('eventSchema', () => {
        const validEvent = {
            title: 'Hackathon 2026',
            description: 'A weekend long coding competition for college students.',
            date: new Date(Date.now() + 86400000).toISOString(), // tomorrow
            venue: 'Engineering Building',
            category: 'Hackathon',
            price: 0,
        };

        it('accepts valid event data', () => {
            const result = eventSchema.safeParse(validEvent);
            expect(result.success).toBe(true);
        });

        it('rejects title shorter than min', () => {
            const result = eventSchema.safeParse({ ...validEvent, title: 'ab' });
            expect(result.success).toBe(false);
        });

        it('rejects title longer than max', () => {
            const result = eventSchema.safeParse({ ...validEvent, title: 'x'.repeat(201) });
            expect(result.success).toBe(false);
        });

        it('rejects past dates', () => {
            const result = eventSchema.safeParse({
                ...validEvent,
                date: '2020-01-01T00:00:00Z'
            });
            expect(result.success).toBe(false);
        });

        it('rejects negative prices', () => {
            const result = eventSchema.safeParse({ ...validEvent, price: -10 });
            expect(result.success).toBe(false);
        });

        it('allows optional fields to be omitted', () => {
            const result = eventSchema.safeParse(validEvent);
            expect(result.success).toBe(true);
        });
    });

    // ── clubSchema ──

    describe('clubSchema', () => {
        const validClub = {
            name: 'Coding Club',
            description: 'A community of coders who build projects together.',
            category: 'Technology',
            collegeId: 'college-123',
        };

        it('accepts valid club data', () => {
            const result = clubSchema.safeParse(validClub);
            expect(result.success).toBe(true);
        });

        it('rejects short club name', () => {
            const result = clubSchema.safeParse({ ...validClub, name: 'X' });
            expect(result.success).toBe(false);
        });

        it('rejects short description', () => {
            const result = clubSchema.safeParse({ ...validClub, description: 'Short' });
            expect(result.success).toBe(false);
        });

        it('requires either collegeId or newCollegeName', () => {
            const { collegeId, ...withoutCollege } = validClub;
            const result = clubSchema.safeParse(withoutCollege);
            expect(result.success).toBe(false);
        });

        it('accepts newCollegeName when no collegeId', () => {
            const { collegeId, ...rest } = validClub;
            const result = clubSchema.safeParse({ ...rest, newCollegeName: 'MIT' });
            expect(result.success).toBe(true);
        });
    });

    // ── joinClubSchema ──

    describe('joinClubSchema', () => {
        it('accepts valid club ID', () => {
            expect(joinClubSchema.safeParse({ clubId: 'abc-123' }).success).toBe(true);
        });

        it('rejects empty club ID', () => {
            expect(joinClubSchema.safeParse({ clubId: '' }).success).toBe(false);
        });
    });

    // ── teamRequestSchema ──

    describe('teamRequestSchema', () => {
        const validRequest = {
            eventId: 'event-1',
            description: 'Looking for a team for the hackathon this weekend.',
            skills: ['React', 'Node.js'],
            type: 'LOOKING_FOR_TEAM' as const,
        };

        it('accepts valid team request', () => {
            expect(teamRequestSchema.safeParse(validRequest).success).toBe(true);
        });

        it('rejects invalid type', () => {
            const result = teamRequestSchema.safeParse({ ...validRequest, type: 'INVALID' });
            expect(result.success).toBe(false);
        });

        it('requires at least one skill', () => {
            const result = teamRequestSchema.safeParse({ ...validRequest, skills: [] });
            expect(result.success).toBe(false);
        });

        it('rejects too many skills', () => {
            const result = teamRequestSchema.safeParse({
                ...validRequest,
                skills: Array(21).fill('skill')
            });
            expect(result.success).toBe(false);
        });
    });

    // ── reviewSchema ──

    describe('reviewSchema', () => {
        it('accepts valid review', () => {
            expect(reviewSchema.safeParse({
                eventId: 'e-1', rating: 5, comment: 'Great!'
            }).success).toBe(true);
        });

        it('rejects rating below 1', () => {
            expect(reviewSchema.safeParse({
                eventId: 'e-1', rating: 0
            }).success).toBe(false);
        });

        it('rejects rating above 5', () => {
            expect(reviewSchema.safeParse({
                eventId: 'e-1', rating: 6
            }).success).toBe(false);
        });

        it('rejects fractional ratings', () => {
            expect(reviewSchema.safeParse({
                eventId: 'e-1', rating: 3.5
            }).success).toBe(false);
        });
    });

    // ── messageSchema ──

    describe('messageSchema', () => {
        it('accepts valid message', () => {
            expect(messageSchema.safeParse({
                content: 'Hello!', conversationId: 'conv-1'
            }).success).toBe(true);
        });

        it('rejects empty content', () => {
            expect(messageSchema.safeParse({
                content: '', conversationId: 'conv-1'
            }).success).toBe(false);
        });

        it('rejects excessively long messages', () => {
            expect(messageSchema.safeParse({
                content: 'x'.repeat(2001), conversationId: 'conv-1'
            }).success).toBe(false);
        });
    });

    // ── userProfileSchema ──

    describe('userProfileSchema', () => {
        it('accepts partial profile updates', () => {
            expect(userProfileSchema.safeParse({ name: 'John' }).success).toBe(true);
        });

        it('accepts empty object (all fields optional)', () => {
            expect(userProfileSchema.safeParse({}).success).toBe(true);
        });

        it('rejects name shorter than min', () => {
            expect(userProfileSchema.safeParse({ name: 'J' }).success).toBe(false);
        });

        it('rejects bio longer than 500 chars', () => {
            expect(userProfileSchema.safeParse({
                bio: 'x'.repeat(501)
            }).success).toBe(false);
        });
    });

    // ── LIMITS export ──

    describe('LIMITS constants', () => {
        it('exports expected limit values', () => {
            expect(LIMITS.TITLE_MIN).toBe(3);
            expect(LIMITS.TITLE_MAX).toBe(200);
            expect(LIMITS.DESCRIPTION_MIN).toBe(10);
            expect(LIMITS.CONTENT_MAX).toBe(10000);
        });
    });
});
