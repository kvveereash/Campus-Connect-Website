/**
 * Pusher channel names, shared by the server, the browser and the auth route.
 *
 * Both are private channels. They used to be public (`user-<id>`,
 * `chat-<id>`), and since the Pusher key is public and user ids appear in
 * profile links and member lists, anyone could subscribe to another user's
 * notifications or to any conversation's typing, read and reaction events.
 * A private channel needs a signature from /api/pusher/auth, which checks
 * that the subscriber is that user, or a participant in that conversation.
 */
export const userChannel = (userId: string) => `private-user-${userId}`;
export const chatChannel = (conversationId: string) => `private-chat-${conversationId}`;

export type ParsedChannel =
    | { kind: 'user'; id: string }
    | { kind: 'chat'; id: string }
    | null;

export function parseChannel(name: string): ParsedChannel {
    const user = /^private-user-([A-Za-z0-9_-]{1,64})$/.exec(name);
    if (user) return { kind: 'user', id: user[1] };
    const chat = /^private-chat-([A-Za-z0-9_-]{1,64})$/.exec(name);
    if (chat) return { kind: 'chat', id: chat[1] };
    return null;
}
