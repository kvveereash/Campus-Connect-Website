'use client';

import PusherClient from 'pusher-js';

let _pusherClient: PusherClient | null = null;

/** The browser's Pusher connection. Private channels are signed by /api/pusher/auth. */
export function getPusherClient(): PusherClient {
    if (!_pusherClient) {
        _pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
            channelAuthorization: { endpoint: '/api/pusher/auth', transport: 'ajax' },
        });
    }
    return _pusherClient;
}

// Kept as a lazy proxy so importing this never connects on its own.
export const pusherClient = new Proxy({} as PusherClient, {
    get(_, prop) {
        return (getPusherClient() as any)[prop];
    },
});
