/**
 * @jest-environment node
 */
import { updateUserProfileSchema } from '../schemas';

const mockUpdate = jest.fn();
const mockGetSession = jest.fn();

jest.mock('@/lib/db', () => ({
    __esModule: true,
    default: {
        $transaction: (fn: (tx: unknown) => unknown) => fn({
            user: { update: (...args: unknown[]) => mockUpdate(...args) },
            college: { findFirst: jest.fn(), create: jest.fn() },
        }),
    },
}));
jest.mock('@/lib/auth', () => ({
    getSession: () => mockGetSession(),
    createSession: jest.fn(),
    deleteSession: jest.fn(),
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/rate-limit', () => ({}));

// Imported after the mocks so the action picks them up.
import { updateUserProfile } from '../actions/auth';

describe('updateUserProfileSchema', () => {
    it('accepts the fields a user may edit', () => {
        const result = updateUserProfileSchema.safeParse({
            name: 'Ada Lovelace',
            bio: 'Hi',
            avatar: '',
            skills: ['TypeScript'],
            portfolioLinks: [{ id: '1', platform: 'GitHub', url: 'https://github.com/ada' }],
        });
        expect(result.success).toBe(true);
    });

    it.each([
        ['role', 'ADMIN'],
        ['emailVerified', new Date().toISOString()],
        ['email', 'someone@else.edu'],
        ['password', 'hunter2'],
        ['lockedUntil', null],
    ])('rejects %s', (key, value) => {
        const result = updateUserProfileSchema.safeParse({ name: 'Ada Lovelace', [key]: value });
        expect(result.success).toBe(false);
    });

    it('rejects javascript: links', () => {
        const result = updateUserProfileSchema.safeParse({
            portfolioLinks: [{ id: '1', platform: 'x', url: 'javascript:alert(1)' }],
        });
        expect(result.success).toBe(false);
    });
});

describe('updateUserProfile', () => {
    beforeEach(() => {
        mockUpdate.mockReset();
        mockGetSession.mockResolvedValue({ userId: 'user-1' });
    });

    it('refuses a role change and writes nothing', async () => {
        const result = await updateUserProfile({ name: 'Ada', role: 'ADMIN' } as never);
        expect(result.success).toBe(false);
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('writes only whitelisted fields for the session user', async () => {
        const result = await updateUserProfile({ name: 'Ada Lovelace', bio: 'Hello' });
        expect(result.success).toBe(true);
        expect(mockUpdate).toHaveBeenCalledWith({
            where: { id: 'user-1' },
            data: { name: 'Ada Lovelace', bio: 'Hello' },
        });
    });

    it('requires a session', async () => {
        mockGetSession.mockResolvedValue(null);
        const result = await updateUserProfile({ name: 'Ada Lovelace' });
        expect(result).toEqual({ success: false, error: 'Unauthorized' });
    });

    it('stops a college admin moving to another college', async () => {
        mockGetSession.mockResolvedValue({
            userId: 'user-1',
            user: { id: 'user-1', role: 'COLLEGE_ADMIN', collegeId: 'college-a' },
        });
        const result = await updateUserProfile({ collegeId: 'college-b' });
        expect(result.success).toBe(false);
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('lets a college admin save their profile with their own college', async () => {
        mockGetSession.mockResolvedValue({
            userId: 'user-1',
            user: { id: 'user-1', role: 'COLLEGE_ADMIN', collegeId: 'college-a' },
        });
        const result = await updateUserProfile({ name: 'Ada Lovelace', collegeId: 'college-a' });
        expect(result.success).toBe(true);
    });
});
