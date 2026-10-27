import 'server-only';

import webpush from 'web-push';
import { after } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

/*
 * Web push: the notification reaches the phone or desktop while the site is
 * closed. Every notification is still written to the database and sent over
 * Pusher first; push is a best-effort extra on top, so nothing here may throw
 * into, or slow down, the code that created the notification.
 *
 * Off unless all three VAPID values are set (generate them with
 * `npx web-push generate-vapid-keys`). With push off, the browser is never
 * asked for permission (src/components/PushToggle.tsx) and sending is a no-op.
 */

export interface PushMessage {
    title: string;
    body: string;
    /** A path on this site, opened when the notification is clicked. */
    url: string;
}

// A day: a reminder or message that has waited longer than that is stale,
// and the in-app list still has it.
const TTL_SECONDS = 24 * 60 * 60;
const CONCURRENCY = 10;
// The push services cap the encrypted payload at about 4KB.
const MAX_BODY = 400;

export function pushEnabled(): boolean {
    return !!(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
        process.env.VAPID_PRIVATE_KEY &&
        process.env.VAPID_SUBJECT
    );
}

/* Only a path on this site: the service worker opens whatever arrives here,
   and a link stored with a notification should never send someone off-site. */
function safePath(url: string): string {
    return url.startsWith('/') && !url.startsWith('//') ? url : '/';
}

function payloadOf(message: PushMessage): string {
    const body = message.body.length > MAX_BODY ? `${message.body.slice(0, MAX_BODY - 1)}…` : message.body;
    return JSON.stringify({ title: message.title, body, url: safePath(message.url) });
}

function statusOf(error: unknown): number | undefined {
    if (error && typeof error === 'object' && 'statusCode' in error) {
        const code = (error as { statusCode: unknown }).statusCode;
        return typeof code === 'number' ? code : undefined;
    }
    return undefined;
}

/**
 * Sends one notification to every device the given users have turned push on
 * for. Never throws. Subscriptions the push service says are gone (404/410:
 * unsubscribed, or the browser data was cleared) are deleted.
 */
export async function sendPush(userIds: string[], message: PushMessage): Promise<void> {
    if (!pushEnabled() || userIds.length === 0) return;

    try {
        const subscriptions = await prisma.pushSubscription.findMany({
            where: { userId: { in: [...new Set(userIds)] } },
            select: { endpoint: true, p256dh: true, auth: true },
        });
        if (subscriptions.length === 0) return;

        const payload = payloadOf(message);
        const options: webpush.RequestOptions = {
            TTL: TTL_SECONDS,
            urgency: 'normal',
            // Passed per request rather than through setVapidDetails, so no
            // module-level state outlives a change to the environment.
            vapidDetails: {
                subject: process.env.VAPID_SUBJECT as string,
                publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
                privateKey: process.env.VAPID_PRIVATE_KEY as string,
            },
        };

        const gone: string[] = [];
        let failed = 0;
        let next = 0;

        // A fixed pool of workers rather than one request per device at once:
        // a reminder to a big event must not open hundreds of sockets.
        const worker = async () => {
            while (next < subscriptions.length) {
                const sub = subscriptions[next++];
                try {
                    await webpush.sendNotification(
                        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                        payload,
                        options,
                    );
                } catch (error) {
                    const status = statusOf(error);
                    if (status === 404 || status === 410) {
                        gone.push(sub.endpoint);
                    } else {
                        failed++;
                        // The status only: an endpoint is a bearer address
                        // for that device, so it stays out of the logs.
                        logger.warn('Push send failed', { statusCode: status ?? null });
                    }
                }
            }
        };
        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, subscriptions.length) }, worker));

        if (gone.length > 0) {
            await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: gone } } });
        }
        if (failed > 0 || gone.length > 0) {
            logger.info('Push sent', { devices: subscriptions.length, failed, removed: gone.length });
        }
    } catch (error) {
        logger.warn('Push could not be sent', { reason: error instanceof Error ? error.name : 'unknown' });
    }
}

/**
 * sendPush without waiting for it. On Netlify the function can be frozen as
 * soon as the response is sent, so the send is handed to Next's `after`,
 * which keeps it alive; outside a request (a script, a test) `after` throws
 * and the promise simply runs on its own.
 */
export function queuePush(userIds: string[], message: PushMessage): void {
    if (!pushEnabled() || userIds.length === 0) return;
    try {
        after(() => sendPush(userIds, message));
    } catch {
        void sendPush(userIds, message);
    }
}
