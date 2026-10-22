/**
 * @jest-environment node
 */
import { createHash } from 'crypto';

const mockSendEmail = jest.fn();
const mockCheckRateLimit = jest.fn();
const mockDb = {
    user: { findFirst: jest.fn(), update: jest.fn() },
    passwordResetToken: { updateMany: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
    $transaction: jest.fn((fn: (tx: unknown) => unknown): unknown => fn(mockDb)),
};

// Getters, because the imports below are hoisted above these initialisers.
jest.mock('@/lib/db', () => ({ __esModule: true, get default() { return mockDb; } }));
const mockEmailEnabled = jest.fn(() => true);
jest.mock('@/lib/email', () => ({
    sendPasswordResetEmail: (...a: unknown[]) => mockSendEmail(...a),
    emailEnabled: () => mockEmailEnabled(),
}));
jest.mock('@/lib/rate-limit', () => ({
    authLimiter: {},
    checkRateLimit: (...a: unknown[]) => mockCheckRateLimit(...a),
}));

import { requestPasswordReset, resetPassword } from '../actions/password-reset';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockCheckRateLimit.mockResolvedValue({ success: true });
});

describe('requestPasswordReset', () => {
    it('stores only the hash of the token it emails', async () => {
        mockDb.user.findFirst.mockResolvedValue({ id: 'u1', email: 'ada@campus.edu' });

        await requestPasswordReset('Ada@Campus.edu ');

        const emailedUrl: string = mockSendEmail.mock.calls[0][1];
        const rawToken = emailedUrl.split('/reset-password/')[1];
        const stored = mockDb.passwordResetToken.create.mock.calls[0][0].data.token;
        expect(stored).toBe(sha256(rawToken));
        expect(stored).not.toBe(rawToken);
        expect(mockSendEmail.mock.calls[0][0]).toBe('ada@campus.edu');
    });

    it('sends nothing once the address is rate limited, and says the same thing', async () => {
        mockCheckRateLimit.mockResolvedValue({ success: false });
        const result = await requestPasswordReset('ada@campus.edu');
        expect(result.success).toBe(true);
        expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('says plainly that no link can be sent when email is off, without looking anyone up', async () => {
        mockEmailEnabled.mockReturnValueOnce(false);
        const result = await requestPasswordReset('ada@campus.edu');
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/not switched on/);
        expect(mockSendEmail).not.toHaveBeenCalled();
        expect(mockCheckRateLimit).not.toHaveBeenCalled();
    });
});

describe('resetPassword', () => {
    it('rejects a short password before touching the database', async () => {
        const result = await resetPassword('token', 'short');
        expect(result.success).toBe(false);
        expect(mockDb.passwordResetToken.updateMany).not.toHaveBeenCalled();
    });

    it('claims the token by its hash, only while unused and unexpired', async () => {
        mockDb.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
        mockDb.passwordResetToken.findUnique.mockResolvedValue({ userId: 'u1' });

        const result = await resetPassword('raw-token', 'a-long-enough-password');

        expect(result.success).toBe(true);
        expect(mockDb.passwordResetToken.updateMany).toHaveBeenCalledWith({
            where: { token: sha256('raw-token'), used: false, expiresAt: { gt: expect.any(Date) } },
            data: { used: true },
        });
        expect(mockDb.user.update).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'u1' } })
        );
    });

    it('does not change the password when the token was already claimed', async () => {
        mockDb.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });

        const result = await resetPassword('raw-token', 'a-long-enough-password');

        expect(result.success).toBe(false);
        expect(mockDb.user.update).not.toHaveBeenCalled();
    });
});
