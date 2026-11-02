/**
 * @jest-environment node
 *
 * An organiser's update to everyone going: one insert, realtime in batches
 * side by side, one push look-up.
 */

const mockTriggerBatch = jest.fn();
const mockQueuePush = jest.fn();
const mockDb = {
    notification: { createManyAndReturn: jest.fn() },
    user: { findUnique: jest.fn() },
};

// Getters, because the imports below are hoisted above these initialisers.
jest.mock('@/lib/db', () => ({ __esModule: true, get default() { return mockDb; } }));
jest.mock('pusher', () => jest.fn().mockImplementation(() => ({ triggerBatch: (...a: unknown[]) => mockTriggerBatch(...a) })));
jest.mock('@/lib/push', () => ({ queuePush: (...a: unknown[]) => mockQueuePush(...a) }));

import { notifyMany } from '../notification-helper';

const env = process.env as Record<string, string | undefined>;
const PUSHER = { PUSHER_APP_ID: '1', PUSHER_SECRET: 's', NEXT_PUBLIC_PUSHER_KEY: 'k', NEXT_PUBLIC_PUSHER_CLUSTER: 'ap2' };

beforeAll(() => Object.assign(env, PUSHER));
afterAll(() => {
    for (const key of Object.keys(PUSHER)) delete env[key];
});

beforeEach(() => {
    jest.clearAllMocks();
    mockTriggerBatch.mockResolvedValue({});
    mockDb.user.findUnique.mockResolvedValue({ name: 'Priya', avatar: null });
    mockDb.notification.createManyAndReturn.mockImplementation(({ data }: { data: { recipientId: string }[] }) =>
        Promise.resolve(data.map((d, i) => ({ ...d, id: `n${i}`, createdAt: new Date(), updatedAt: new Date() }))),
    );
});

const people = (n: number) => Array.from({ length: n }, (_, i) => `u${i}`);

describe('notifyMany', () => {
    it('writes every notification in one insert and pushes once', async () => {
        const sent = await notifyMany(people(25), 'org', 'EVENT_UPDATE', 'posted an update', '/events/e1');

        expect(sent).toBe(25);
        expect(mockDb.notification.createManyAndReturn).toHaveBeenCalledTimes(1);
        expect(mockQueuePush).toHaveBeenCalledTimes(1);
        expect(mockQueuePush).toHaveBeenCalledWith(people(25), expect.objectContaining({ body: 'Priya posted an update', url: '/events/e1' }));
    });

    it('sends realtime ten to a request, each on the person’s own channel with the bell’s shape', async () => {
        await notifyMany(people(25), 'org', 'EVENT_UPDATE', 'posted an update', '/events/e1');

        expect(mockTriggerBatch).toHaveBeenCalledTimes(3);
        expect(mockTriggerBatch.mock.calls.map(([batch]) => batch.length)).toEqual([10, 10, 5]);
        const [first] = mockTriggerBatch.mock.calls[0][0];
        expect(first.channel).toBe('private-user-u0');
        expect(first.name).toBe('notification:new');
        expect(first.data).toEqual(expect.objectContaining({ id: 'n0', recipientId: 'u0', actor: { name: 'Priya', avatar: null } }));
    });

    it('still counts the update as sent when realtime fails', async () => {
        mockTriggerBatch.mockRejectedValue(new Error('pusher down'));
        jest.spyOn(console, 'error').mockImplementation(() => {});
        await expect(notifyMany(people(3), 'org', 'EVENT_UPDATE', 'x', '/')).resolves.toBe(3);
    });

    it('does nothing for nobody', async () => {
        await expect(notifyMany([], 'org', 'EVENT_UPDATE', 'x', '/')).resolves.toBe(0);
        expect(mockDb.notification.createManyAndReturn).not.toHaveBeenCalled();
    });
});
