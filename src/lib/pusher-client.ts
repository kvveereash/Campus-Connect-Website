'use client';

import PusherClient from 'pusher-js';

let _pusherClient: PusherClient | null = null;

/**
 * Stands in for the client when no Pusher key is configured. pusher-js throws
 * on construction without one, and the subscribers run inside components on
 * every signed-in page, so one missing environment variable took the whole
 * app down. Without a key, realtime updates are simply off.
 */
function offlineClient(): PusherClient {
    const channel = {
        bind: () => channel,
        unbind: () => channel,
        unbind_all: () => channel,
        trigger: () => false,
    };
    return {
        subscribe: () => channel,
        unsubscribe: () => {},
        channel: () => channel,
        bind: () => {},
        unbind: () => {},
        disconnect: () => {},
        connection: { bind: () => {}, unbind: () => {}, state: 'unavailable' },
    } as unknown as PusherClient;
}

/** The browser's Pusher connection. Private channels are signed by /api/pusher/auth. */
export function getPusherClient(): PusherClient {
    if (!_pusherClient) {
        const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
        _pusherClient = key
            ? new PusherClient(key, {
                  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
                  channelAuthorization: { endpoint: '/api/pusher/auth', transport: 'ajax' },
              })
            : offlineClient();
    }
    return _pusherClient;
}

// Kept as a lazy proxy so importing this never connects on its own.
export const pusherClient = new Proxy({} as PusherClient, {
    get(_, prop) {
        return (getPusherClient() as any)[prop];
    },
});
