import 'server-only';

import PusherServer from 'pusher';

/* Server half of Pusher. It used to share a module with the browser client,
   so client components that imported pusherClient pulled the Node SDK into
   the browser bundle. server-only keeps the secret-holding side out. */

let _pusherServer: PusherServer | null = null;

export function isPusherConfigured(): boolean {
    return !!(process.env.PUSHER_APP_ID && process.env.PUSHER_SECRET
        && process.env.NEXT_PUBLIC_PUSHER_KEY && process.env.NEXT_PUBLIC_PUSHER_CLUSTER);
}

// Lazy initialization to prevent build-time crashes when env vars aren't available
export function getPusherServer(): PusherServer {
    if (!_pusherServer) {
        _pusherServer = new PusherServer({
            appId: process.env.PUSHER_APP_ID!,
            key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
            secret: process.env.PUSHER_SECRET!,
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
            useTLS: true,
        });
    }
    return _pusherServer;
}

/**
 * Send a realtime event, best effort.
 *
 * Realtime is a nicety on top of a write that has already been committed, so
 * a Pusher outage (or no Pusher configured) must not turn a successful action
 * into a reported failure. Triggers used to be awaited bare, which did that.
 */
export async function broadcast(channel: string, event: string, data: unknown): Promise<void> {
    if (!isPusherConfigured()) return;
    try {
        await getPusherServer().trigger(channel, event, data);
    } catch (error) {
        console.error(`[Pusher] ${event} on ${channel} failed:`, error);
    }
}
