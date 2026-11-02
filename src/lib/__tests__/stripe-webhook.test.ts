/**
 * @jest-environment node
 */

const mockVerify = jest.fn();
const mockRefund = jest.fn(async () => undefined);
const mockFindOutside = jest.fn();
const mockFindLocked = jest.fn();
const mockCount = jest.fn();
const mockUpdate = jest.fn(async () => ({}));
const mockEventUpdate = jest.fn(async () => ({}));
const mockLock = jest.fn(async () => []);
const mockNotify = jest.fn(async () => ({}));
const mockAwardBadges = jest.fn(async () => []);

jest.mock('@/lib/stripe', () => ({
    verifyWebhookSignature: (...a: unknown[]) => mockVerify(...a),
    refundCheckoutPayment: (...a: unknown[]) => mockRefund(...(a as [])),
}));
jest.mock('@/lib/db', () => ({
    __esModule: true,
    default: {
        eventRegistration: { findUnique: (...a: unknown[]) => mockFindOutside(...a) },
        notification: { create: (...a: unknown[]) => mockNotify(...(a as [])) },
        // The transaction client: the lock, the second read, the seat count.
        $transaction: (fn: (tx: unknown) => unknown) =>
            fn({
                $queryRaw: (...a: unknown[]) => mockLock(...(a as [])),
                eventRegistration: {
                    findUnique: (...a: unknown[]) => mockFindLocked(...a),
                    count: (...a: unknown[]) => mockCount(...a),
                    update: (...a: unknown[]) => mockUpdate(...(a as [])),
                },
                event: { update: (...a: unknown[]) => mockEventUpdate(...(a as [])) },
            }),
    },
}));
jest.mock('@/lib/notification-helper', () => ({ createNotification: jest.fn() }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/badges', () => ({ checkAndAwardBadges: (...a: unknown[]) => mockAwardBadges(...(a as [])) }));

import type Stripe from 'stripe';
import type { NextRequest } from 'next/server';
import { POST } from '@/app/api/webhooks/stripe/route';
import { settlePaidCheckout } from '../payments';

function request(): NextRequest {
    return {
        text: async () => '{}',
        headers: new Headers({ 'stripe-signature': 'sig' }),
    } as unknown as NextRequest;
}

function checkout(overrides: Record<string, unknown> = {}) {
    return {
        id: 'cs_1',
        payment_status: 'paid',
        payment_intent: 'pi_1',
        amount_total: 50000,
        metadata: { registrationId: 'reg_1' },
        ...overrides,
    } as unknown as Stripe.Checkout.Session;
}

function completed(overrides: Record<string, unknown> = {}) {
    return { type: 'checkout.session.completed', data: { object: checkout(overrides) } };
}

function place(status: string, overrides: Record<string, unknown> = {}) {
    return {
        status,
        paymentId: 'cs_1',
        userId: 'u1',
        event: { capacity: 10, title: 'Intro to Rust', category: 'Workshop' },
        ...overrides,
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockFindOutside.mockResolvedValue({ eventId: 'evt_1' });
});

describe('settlePaidCheckout', () => {
    it('gives the seat when there is one: PAID, counted, badges, no refund', async () => {
        mockFindLocked.mockResolvedValue(place('PENDING_PAYMENT'));
        mockCount.mockResolvedValue(9);

        await expect(settlePaidCheckout(checkout())).resolves.toBe('paid');
        // Seats are counted with the event locked, like every other seat change.
        expect(mockLock).toHaveBeenCalled();
        expect(mockUpdate).toHaveBeenCalledWith({
            where: { id: 'reg_1' },
            data: { status: 'PAID', paymentId: 'cs_1', amountPaid: 500 },
        });
        expect(mockEventUpdate).toHaveBeenCalledWith({ where: { id: 'evt_1' }, data: { registrationCount: { increment: 1 } } });
        expect(mockAwardBadges).toHaveBeenCalledWith('u1', 'Workshop');
        expect(mockRefund).not.toHaveBeenCalled();
    });

    it('never overbooks: a payment for a full event is refunded and the payer waits in line', async () => {
        mockFindLocked.mockResolvedValue(place('PENDING_PAYMENT'));
        mockCount.mockResolvedValue(10);

        await expect(settlePaidCheckout(checkout())).resolves.toBe('refunded');
        expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'reg_1' }, data: { status: 'WAITLISTED' } });
        expect(mockEventUpdate).not.toHaveBeenCalled();
        expect(mockRefund).toHaveBeenCalledWith('pi_1', 'cs_1');
        expect(mockNotify).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ recipientId: 'u1', message: expect.stringContaining('refunded') }) }),
        );
    });

    it('refunds a payment for a place cancelled while checkout was open, instead of keeping it', async () => {
        mockFindOutside.mockResolvedValue(null);

        await expect(settlePaidCheckout(checkout())).resolves.toBe('refunded');
        expect(mockRefund).toHaveBeenCalledWith('pi_1', 'cs_1');
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('refunds when the place was deleted between the first read and the lock', async () => {
        mockFindLocked.mockResolvedValue(null);
        await expect(settlePaidCheckout(checkout())).resolves.toBe('refunded');
        expect(mockRefund).toHaveBeenCalled();
    });

    it('refunds a second payment for a place already paid by another checkout', async () => {
        mockFindLocked.mockResolvedValue(place('PAID', { paymentId: 'cs_other' }));
        await expect(settlePaidCheckout(checkout())).resolves.toBe('refunded');
        expect(mockRefund).toHaveBeenCalledWith('pi_1', 'cs_1');
    });

    it('does nothing for a repeated webhook about the payment that made the place', async () => {
        mockFindLocked.mockResolvedValue(place('PAID'));
        await expect(settlePaidCheckout(checkout())).resolves.toBe('already-paid');
        expect(mockUpdate).not.toHaveBeenCalled();
        expect(mockRefund).not.toHaveBeenCalled();
    });

    it('lets a waitlisted person with an old open checkout in, if a seat is free when they pay', async () => {
        mockFindLocked.mockResolvedValue(place('WAITLISTED'));
        mockCount.mockResolvedValue(3);
        await expect(settlePaidCheckout(checkout())).resolves.toBe('paid');
    });

    it('still reports the refund if telling the payer fails', async () => {
        mockFindLocked.mockResolvedValue(place('PENDING_PAYMENT'));
        mockCount.mockResolvedValue(10);
        mockNotify.mockRejectedValueOnce(new Error('db down'));
        await expect(settlePaidCheckout(checkout())).resolves.toBe('refunded');
    });
});

describe('Stripe webhook', () => {
    it('settles a paid checkout', async () => {
        mockVerify.mockReturnValue(completed());
        mockFindLocked.mockResolvedValue(place('PENDING_PAYMENT'));
        mockCount.mockResolvedValue(0);

        const res = await POST(request());
        expect(res.status).toBe(200);
        expect(mockUpdate).toHaveBeenCalledTimes(1);
    });

    it('does not settle an unpaid checkout', async () => {
        mockVerify.mockReturnValue(completed({ payment_status: 'unpaid' }));
        const res = await POST(request());
        expect(res.status).toBe(200);
        expect(mockFindOutside).not.toHaveBeenCalled();
    });

    it('returns 500 when the database fails, so Stripe retries', async () => {
        mockVerify.mockReturnValue(completed());
        mockFindOutside.mockRejectedValue(new Error('connection lost'));
        const res = await POST(request());
        expect(res.status).toBe(500);
    });

    it('returns 500 when the refund fails, so Stripe retries it', async () => {
        mockVerify.mockReturnValue(completed());
        mockFindOutside.mockResolvedValue(null);
        mockRefund.mockRejectedValueOnce(new Error('stripe down'));
        const res = await POST(request());
        expect(res.status).toBe(500);
    });

    it('rejects a bad signature', async () => {
        mockVerify.mockReturnValue(null);
        const res = await POST(request());
        expect(res.status).toBe(400);
    });
});
