/**
 * @jest-environment node
 */

const mockClubMember = jest.fn();
jest.mock('@/lib/db', () => ({
    __esModule: true,
    default: { clubMember: { findUnique: (...a: unknown[]) => mockClubMember(...a) } },
}));

// Only the key is needed; the real module pulls in jose, which is ESM only.
jest.mock('@/lib/auth-edge', () => ({
    getSigningKey: () => new TextEncoder().encode('test-key-that-is-at-least-32-characters'),
}));

import { canManageEvent, checkInUrl, readTicketToken, ticketToken } from '../ticket';

describe('ticket tokens', () => {
    it('reads back the registration it was issued for', () => {
        expect(readTicketToken(ticketToken('cmreg123'))).toBe('cmreg123');
    });

    it('refuses a token for one registration signed for another', () => {
        const [, sig] = ticketToken('cmreg123').split('.');
        expect(readTicketToken(`cmreg999.${sig}`)).toBeNull();
    });

    it.each(['', 'cmreg123', 'cmreg123.', '.abc', 'cmreg123.not-the-signature', 'x'.repeat(200)])(
        'refuses %p',
        (token) => {
            expect(readTicketToken(token)).toBeNull();
        },
    );

    describe('with TICKET_SECRET set', () => {
        const env = process.env as Record<string, string | undefined>;
        const legacy = ticketToken('cmreg123'); // signed with the session key
        beforeAll(() => {
            env.TICKET_SECRET = 'a-separate-ticket-secret-of-32-plus-chars';
        });
        afterAll(() => {
            delete env.TICKET_SECRET;
        });

        it('signs new tickets with its own key, not the session key', () => {
            expect(ticketToken('cmreg123')).not.toBe(legacy);
            expect(readTicketToken(ticketToken('cmreg123'))).toBe('cmreg123');
        });

        it('still accepts a ticket issued before it was set', () => {
            expect(readTicketToken(legacy)).toBe('cmreg123');
        });

        it('ignores a secret too short to be one', () => {
            env.TICKET_SECRET = 'short';
            expect(ticketToken('cmreg123')).toBe(legacy);
            env.TICKET_SECRET = 'a-separate-ticket-secret-of-32-plus-chars';
        });
    });

    it('puts the token in the check-in link for that event', () => {
        const url = new URL(checkInUrl('cmevent1', 'cmreg123'));
        expect(url.pathname).toBe('/events/cmevent1/check-in');
        expect(readTicketToken(url.searchParams.get('t'))).toBe('cmreg123');
    });
});

describe('canManageEvent', () => {
    const event = { creatorId: 'creator', clubId: 'club1' };

    beforeEach(() => mockClubMember.mockReset());

    it('lets the creator and site admins in without asking the database', async () => {
        await expect(canManageEvent(event, { userId: 'creator' })).resolves.toBe(true);
        await expect(canManageEvent(event, { userId: 'someone', user: { role: 'ADMIN' } })).resolves.toBe(true);
        expect(mockClubMember).not.toHaveBeenCalled();
    });

    it('lets an admin of the hosting club in, and not an ordinary member', async () => {
        mockClubMember.mockResolvedValueOnce({ role: 'ADMIN' });
        await expect(canManageEvent(event, { userId: 'club-admin' })).resolves.toBe(true);
        mockClubMember.mockResolvedValueOnce({ role: 'MEMBER' });
        await expect(canManageEvent(event, { userId: 'member' })).resolves.toBe(false);
    });

    it('turns away visitors and events with no club to ask about', async () => {
        await expect(canManageEvent(event, null)).resolves.toBe(false);
        await expect(canManageEvent({ creatorId: 'creator', clubId: null }, { userId: 'someone' })).resolves.toBe(false);
    });
});
