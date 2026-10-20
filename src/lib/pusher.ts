import PusherServer from 'pusher';
import PusherClient from 'pusher-js';

// Lazy initialization to prevent build-time crashes when env vars aren't available
let _pusherServer: PusherServer | null = null;
let _pusherClient: PusherClient | null = null;

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

export function getPusherClient(): PusherClient {
    if (!_pusherClient) {
        const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
        _pusherClient = key
            ? new PusherClient(key, { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER! })
            : offlineClient();
    }
    return _pusherClient;
}

// Keep backward-compatible exports as getters
export const pusherServer = new Proxy({} as PusherServer, {
    get(_, prop) {
        return (getPusherServer() as any)[prop];
    },
});

export const pusherClient = new Proxy({} as PusherClient, {
    get(_, prop) {
        return (getPusherClient() as any)[prop];
    },
});
