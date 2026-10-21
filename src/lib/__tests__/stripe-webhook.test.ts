/**
 * @jest-environment node
 */

const mockVerify = jest.fn();
const mockUpdateMany = jest.fn();
const mockFindUnique = jest.fn();

jest.mock('@/lib/stripe', () => ({
    verifyWebhookSignature: (...args: unknown[]) => mockVerify(...args),
}));
jest.mock('@/lib/db', () => ({
    __esModule: true,
    default: {
        eventRegistration: {
            updateMany: (...args: unknown[]) => mockUpdateMany(...args),
            findUnique: (...args: unknown[]) => mockFindUnique(...args),
        },
        event: { update: (...args: unknown[]) => mockEventUpdate(...(args as [])) },
    },
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
const mockAwardBadges = jest.fn(async () => []);
const mockEventUpdate = jest.fn(async () => ({}));
jest.mock('@/lib/badges', () => ({ checkAndAwardBadges: (...a: unknown[]) => mockAwardBadges(...(a as [])) }));

import type { NextRequest } from 'next/server';
import { POST } from '@/app/api/webhooks/stripe/route';
import { markRegistrationPaid } from '../payments';

function request(): NextRequest {
    return {
        text: async () => '{}',
        headers: new Headers({ 'stripe-signature': 'sig' }),
    } as unknown as NextRequest;
}

function checkoutCompleted(overrides: Record<string, unknown> = {}) {
    return {
        type: 'checkout.session.completed',
        data: {
            object: {
                id: 'cs_1',
                payment_status: 'paid',
                amount_total: 50000,
                metadata: { registrationId: 'reg_1' },
                ...overrides,
            },
        },
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('markRegistrationPaid', () => {
    it('only moves a PENDING or PENDING_PAYMENT registration to PAID', async () => {
        mockUpdateMany.mockResolvedValue({ count: 1 });
        mockFindUnique.mockResolvedValue({ eventId: 'evt_1', userId: 'u1', event: { category: 'Hackathon' } });

        await expect(markRegistrationPaid('reg_1', 'cs_1', 500)).resolves.toEqual({ updated: true });
        // The place counts, and earns badges, only once paid.
        expect(mockEventUpdate).toHaveBeenCalledWith({ where: { id: 'evt_1' }, data: { registrationCount: { increment: 1 } } });
        expect(mockAwardBadges).toHaveBeenCalledWith('u1', 'Hackathon');
        expect(mockUpdateMany).toHaveBeenCalledWith({
            where: { id: 'reg_1', status: { in: ['PENDING', 'PENDING_PAYMENT'] } },
            data: { status: 'PAID', paymentId: 'cs_1', amountPaid: 500 },
        });
    });

    it('reports no update for a registration that is not awaiting payment', async () => {
        mockUpdateMany.mockResolvedValue({ count: 0 });
        await expect(markRegistrationPaid('reg_1', 'cs_1', 500)).resolves.toEqual({ updated: false });
    });
});

describe('Stripe webhook', () => {
    it('marks the registration paid for a paid checkout', async () => {
        mockVerify.mockReturnValue(checkoutCompleted());
        mockUpdateMany.mockResolvedValue({ count: 1 });
        mockFindUnique.mockResolvedValue({ eventId: 'evt_1', userId: 'u1', event: { category: 'Hackathon' } });

        const res = await POST(request());
        expect(res.status).toBe(200);
        expect(mockUpdateMany).toHaveBeenCalledTimes(1);
    });

    it('does not mark an unpaid checkout as paid', async () => {
        mockVerify.mockReturnValue(checkoutCompleted({ payment_status: 'unpaid' }));

        const res = await POST(request());
        expect(res.status).toBe(200);
        expect(mockUpdateMany).not.toHaveBeenCalled();
    });

    it('returns 500 when the database update fails, so Stripe retries', async () => {
        mockVerify.mockReturnValue(checkoutCompleted());
        mockUpdateMany.mockRejectedValue(new Error('connection lost'));

        const res = await POST(request());
        expect(res.status).toBe(500);
    });

    it('rejects a bad signature', async () => {
        mockVerify.mockReturnValue(null);
        const res = await POST(request());
        expect(res.status).toBe(400);
    });
});
