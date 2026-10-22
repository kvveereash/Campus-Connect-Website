/**
 * @jest-environment node
 */

const mockClubMember = jest.fn();
jest.mock('@/lib/db', () => ({
    __esModule: true,
    default: { clubMember: { findUnique: (...a: unknown[]) => mockClubMember(...a) } },
}));

import { canManageEvent, checkInUrl, readTicketToken, ticketToken, ticketsEnabled } from '../ticket';

describe('ticket tokens', () => {
    beforeAll(() => {
        process.env.TICKET_SECRET = 'test-ticket-secret-at-least-32-characters';
    });

    it('reads back the registration it was issued for', () => {
        expect(readTicketToken(ticketToken('cmreg123'))).toBe('cmreg123');
    });

    it('refuses a token for one registration signed for another', () => {
        const [, sig] = (ticketToken('cmreg123') ?? '').split('.');
        expect(readTicketToken(`cmreg999.${sig}`)).toBeNull();
    });

    it('refuses a token signed with a different secret', () => {
        const token = ticketToken('cmreg123');
        process.env.TICKET_SECRET = 'a-rotated-ticket-secret-of-32-characters';
        expect(readTicketToken(token)).toBeNull();
        process.env.TICKET_SECRET = 'test-ticket-secret-at-least-32-characters';
    });

    it('is off in production until TICKET_SECRET is set, rather than using a stand-in key', () => {
        const env = process.env as Record<string, string | undefined>;
        const [secret, nodeEnv] = [env.TICKET_SECRET, env.NODE_ENV];
        env.TICKET_SECRET = undefined;
        env.NODE_ENV = 'production';
        try {
            expect(ticketsEnabled()).toBe(false);
            expect(ticketToken('cmreg123')).toBeNull();
            expect(checkInUrl('cmevent1', 'cmreg123')).toBeNull();
        } finally {
            env.TICKET_SECRET = secret;
            env.NODE_ENV = nodeEnv;
        }
    });

    it.each(['', 'cmreg123', 'cmreg123.', '.abc', 'cmreg123.not-the-signature', 'x'.repeat(200)])(
        'refuses %p',
        (token) => {
            expect(readTicketToken(token)).toBeNull();
        },
    );

    it('refuses a ticket signed with the session key: only TICKET_SECRET signs tickets', async () => {
        const { createHmac } = await import('node:crypto');
        const env = process.env as Record<string, string | undefined>;
        const sessionKey = env.JWT_SECRET ?? 'fallback-secret-key-for-dev-only';
        const forged = `cmreg123.${createHmac('sha256', sessionKey).update('ticket:cmreg123').digest('base64url').slice(0, 22)}`;
        expect(readTicketToken(forged)).toBeNull();
    });

    it('does not count a secret too short to be one in production', () => {
        const env = process.env as Record<string, string | undefined>;
        const [secret, nodeEnv] = [env.TICKET_SECRET, env.NODE_ENV];
        env.TICKET_SECRET = 'short';
        env.NODE_ENV = 'production';
        try {
            expect(ticketsEnabled()).toBe(false);
        } finally {
            env.TICKET_SECRET = secret;
            env.NODE_ENV = nodeEnv;
        }
    });

    it('puts the token in the check-in link for that event', () => {
        const url = new URL(checkInUrl('cmevent1', 'cmreg123') ?? '');
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
