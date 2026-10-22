/**
 * @jest-environment node
 */

const mockSession = jest.fn();
const mockEvent = jest.fn();
const mockClubs = jest.fn();
const mockCount = jest.fn();
const mockCollege = jest.fn();

jest.mock('@/lib/auth', () => ({ getSession: () => mockSession() }));
jest.mock('@/lib/db', () => ({
    __esModule: true,
    default: {
        event: { findFirst: (...a: unknown[]) => mockEvent(...a) },
        clubMember: { findMany: (...a: unknown[]) => mockClubs(...a) },
        eventRegistration: { count: (...a: unknown[]) => mockCount(...a) },
        college: { findUnique: (...a: unknown[]) => mockCollege(...a) },
    },
}));

import { getGoingNearYou } from '@/lib/actions/going';

beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockResolvedValue({ userId: 'me', user: { collegeId: 'col1' } });
    mockEvent.mockResolvedValue({ id: 'ev1' });
    mockClubs.mockResolvedValue([{ clubId: 'c1' }]);
    mockCount.mockResolvedValueOnce(3).mockResolvedValueOnce(2);
    mockCollege.mockResolvedValue({ name: 'IIT Mumbai' });
});

describe('getGoingNearYou', () => {
    it('counts people from your college and your clubs, never you, never names', async () => {
        expect(await getGoingNearYou('ev1')).toEqual({ college: 3, collegeName: 'IIT Mumbai', clubs: 2 });
        for (const [arg] of mockCount.mock.calls) {
            expect(arg.where.userId).toEqual({ not: 'me' });
            expect(arg.where.status).toEqual({ in: ['PAID', 'COMPLETED'] });
            expect(arg).not.toHaveProperty('select');
        }
    });

    it('is all zeros when signed out, and does not query', async () => {
        mockSession.mockResolvedValue(null);
        expect(await getGoingNearYou('ev1')).toEqual({ college: 0, collegeName: null, clubs: 0 });
        expect(mockCount).not.toHaveBeenCalled();
    });

    it('is all zeros for an event that is not live', async () => {
        mockEvent.mockResolvedValue(null);
        expect(await getGoingNearYou('ev1')).toEqual({ college: 0, collegeName: null, clubs: 0 });
        expect(mockCount).not.toHaveBeenCalled();
    });
});
