import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import prisma from '@/lib/db';
import { getSigningKey } from '@/lib/auth-edge';
import { SITE_URL } from '@/lib/site';

/*
 * Tickets for QR check-in. A ticket is the registration id plus an HMAC of
 * it, so the QR code cannot be made up from a guessed id, and it never
 * expires: a screenshot taken the night before still works at the door.
 * The message carries a "ticket:" prefix, so a ticket signature can never
 * be passed off as anything else.
 *
 * Keys: TICKET_SECRET when it is set (32+ characters), else the session key.
 * Tickets have their own key so that rotating JWT_SECRET to end every
 * session (after a leak) does not void every ticket already issued, and a
 * leaked session key cannot mint tickets. Tickets signed with the session
 * key before TICKET_SECRET was set are still accepted, so no QR code anyone
 * holds stops working when it is introduced.
 */

/** Registrations that count as going: free sign-ups and paid ones. */
export const GOING = ['PAID', 'COMPLETED'] as const;

const MIN_TICKET_SECRET = 32;

function ownTicketKey(): string | null {
    const secret = process.env.TICKET_SECRET;
    return secret && secret.length >= MIN_TICKET_SECRET ? secret : null;
}

function signature(registrationId: string, key: string | Uint8Array) {
    return createHmac('sha256', key).update(`ticket:${registrationId}`).digest('base64url').slice(0, 22);
}

export function ticketToken(registrationId: string) {
    return `${registrationId}.${signature(registrationId, ownTicketKey() ?? getSigningKey())}`;
}

function matches(expected: string, given: string) {
    const a = Buffer.from(expected);
    const b = Buffer.from(given);
    return a.length === b.length && timingSafeEqual(a, b);
}

/** The registration id a token was issued for, or null if it was not issued by us. */
export function readTicketToken(token: string | undefined | null): string | null {
    if (!token || token.length > 120) return null;
    const [id, sig] = token.split('.');
    if (!id || !sig) return null;
    const own = ownTicketKey();
    if (own && matches(signature(id, own), sig)) return id;
    // Issued before TICKET_SECRET existed, or it is not set.
    return matches(signature(id, getSigningKey()), sig) ? id : null;
}

/** The link an organiser's phone camera opens when it reads the QR code. */
export function checkInUrl(eventId: string, registrationId: string) {
    // Locally this points at the dev server, so scanning can be tried there.
    const base = process.env.NEXT_PUBLIC_APP_URL || SITE_URL;
    return `${base}/events/${eventId}/check-in?t=${encodeURIComponent(ticketToken(registrationId))}`;
}

/**
 * Whether this user runs the event: its creator, an admin of the club hosting
 * it, or a site admin. Check-in and the attendee list are theirs alone.
 */
export async function canManageEvent(
    event: { creatorId: string | null; clubId: string | null },
    session: { userId: string; user?: { role?: string } } | null,
) {
    if (!session?.userId) return false;
    if (session.user?.role === 'ADMIN' || event.creatorId === session.userId) return true;
    if (!event.clubId) return false;
    const member = await prisma.clubMember.findUnique({
        where: { userId_clubId: { userId: session.userId, clubId: event.clubId } },
        select: { role: true },
    });
    return member?.role === 'ADMIN';
}
