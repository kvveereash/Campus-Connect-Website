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

export function getPusherClient(): PusherClient {
    if (!_pusherClient) {
        _pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        });
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
