/**
 * @jest-environment node
 *
 * "Interested" sets the state the student tapped for, so a tap before the
 * button knew the event was saved cannot quietly unsave it.
 */

const mockGetSession = jest.fn();
const mockDb = {
    event: { findFirst: jest.fn() },
    eventInterest: { upsert: jest.fn(), deleteMany: jest.fn() },
    auditLog: { create: jest.fn() },
};

// A getter, because the imports below are hoisted above mockDb's initialiser.
jest.mock('@/lib/db', () => ({ __esModule: true, get default() { return mockDb; } }));
jest.mock('@/lib/auth', () => ({ getSession: () => mockGetSession() }));

import { setInterest } from '../actions/interest';

beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({
        userId: 'me',
        user: { id: 'me', name: 'Me', email: 'me@x.edu', role: 'USER', avatar: null },
    });
    mockDb.event.findFirst.mockResolvedValue({ id: 'e1' });
});

describe('setInterest', () => {
    it('saves when asked to save, even if it already was', async () => {
        await expect(setInterest('e1', true)).resolves.toEqual({ interested: true });
        await expect(setInterest('e1', true)).resolves.toEqual({ interested: true });
        expect(mockDb.eventInterest.upsert).toHaveBeenCalledTimes(2);
        expect(mockDb.eventInterest.deleteMany).not.toHaveBeenCalled();
    });

    it('unsaves only the caller’s own save', async () => {
        await expect(setInterest('e1', false)).resolves.toEqual({ interested: false });
        expect(mockDb.eventInterest.deleteMany).toHaveBeenCalledWith({ where: { userId: 'me', eventId: 'e1' } });
        expect(mockDb.eventInterest.upsert).not.toHaveBeenCalled();
    });

    it('saves only approved, live events', async () => {
        mockDb.event.findFirst.mockResolvedValue(null);
        const result = await setInterest('e1', true);
        expect(result.error).toBeTruthy();
        expect(mockDb.eventInterest.upsert).not.toHaveBeenCalled();
    });
});
