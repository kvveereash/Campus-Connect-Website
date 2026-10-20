import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { parseChannel } from '@/lib/pusher-channels';
import { getPusherServer, isPusherConfigured } from '@/lib/pusher-server';

/**
 * Signs private-channel subscriptions.
 *
 * pusher-js posts socket_id and channel_name here before subscribing to any
 * private- channel. A user may subscribe to their own notification channel,
 * and to a conversation's channel only while they are a participant in it.
 * The middleware skips /api, so this route checks the session itself.
 */
export async function POST(request: NextRequest) {
    if (!isPusherConfigured()) {
        return NextResponse.json({ error: 'Realtime is not configured' }, { status: 503 });
    }

    const session = await getSession();
    if (!session?.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.userId as string;

    let socketId: unknown;
    let channelName: unknown;
    try {
        const form = await request.formData();
        socketId = form.get('socket_id');
        channelName = form.get('channel_name');
    } catch {
        return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }
    if (typeof socketId !== 'string' || typeof channelName !== 'string'
        || !/^\d+\.\d+$/.test(socketId)) {
        return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }

    const channel = parseChannel(channelName);
    let allowed = false;

    if (channel?.kind === 'user') {
        allowed = channel.id === userId;
    } else if (channel?.kind === 'chat') {
        const participant = await prisma.conversationParticipant.findUnique({
            where: { userId_conversationId: { userId, conversationId: channel.id } },
            select: { id: true },
        });
        allowed = !!participant;
    }

    if (!allowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(getPusherServer().authorizeChannel(socketId, channelName));
}
