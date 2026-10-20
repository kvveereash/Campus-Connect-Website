/**
 * @jest-environment node
 */

const mockGetSession = jest.fn();
const mockFindParticipant = jest.fn();
const mockAuthorize = jest.fn(() => ({ auth: 'key:signature' }));

jest.mock('@/lib/auth', () => ({ getSession: () => mockGetSession() }));
jest.mock('@/lib/db', () => ({
    __esModule: true,
    default: { conversationParticipant: { findUnique: (...a: unknown[]) => mockFindParticipant(...a) } },
}));
jest.mock('@/lib/pusher-server', () => ({
    isPusherConfigured: () => true,
    getPusherServer: () => ({ authorizeChannel: (...a: unknown[]) => mockAuthorize(...(a as [])) }),
}));

import type { NextRequest } from 'next/server';
import { POST } from '@/app/api/pusher/auth/route';

function request(channel: string, socketId = '1234.5678'): NextRequest {
    const form = new FormData();
    form.set('socket_id', socketId);
    form.set('channel_name', channel);
    return { formData: async () => form } as unknown as NextRequest;
}

beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ userId: 'me' });
});

describe('Pusher channel auth', () => {
    it('signs the user\'s own notification channel', async () => {
        const res = await POST(request('private-user-me'));
        expect(res.status).toBe(200);
        expect(mockAuthorize).toHaveBeenCalledWith('1234.5678', 'private-user-me');
    });

    it('refuses another user\'s notification channel', async () => {
        const res = await POST(request('private-user-someone-else'));
        expect(res.status).toBe(403);
        expect(mockAuthorize).not.toHaveBeenCalled();
    });

    it('signs a conversation channel only for a participant', async () => {
        mockFindParticipant.mockResolvedValueOnce({ id: 'p1' });
        expect((await POST(request('private-chat-c1'))).status).toBe(200);

        mockFindParticipant.mockResolvedValueOnce(null);
        expect((await POST(request('private-chat-c2'))).status).toBe(403);
    });

    it('refuses without a session', async () => {
        mockGetSession.mockResolvedValue(null);
        expect((await POST(request('private-user-me'))).status).toBe(401);
    });

    it('refuses unknown channel names and malformed socket ids', async () => {
        expect((await POST(request('presence-anything'))).status).toBe(403);
        expect((await POST(request('private-user-me', 'not-a-socket'))).status).toBe(400);
    });
});
