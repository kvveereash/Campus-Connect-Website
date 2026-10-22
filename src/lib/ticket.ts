import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import prisma from '@/lib/db';
import { getSigningKey } from '@/lib/auth-edge';
import { SITE_URL } from '@/lib/site';

/*
 * Tickets for QR check-in. A ticket is the registration id plus an HMAC of
 * it, so the QR code cannot be made up from a guessed id, and it never
 * expires: a screenshot taken the night before still works at the door.
 * The key is the session key with a "ticket:" prefix on the message, so a
 * ticket signature can never be passed off as anything else.
 */

/** Registrations that count as going: free sign-ups and paid ones. */
export const GOING = ['PAID', 'COMPLETED'] as const;

function signature(registrationId: string) {
    return createHmac('sha256', getSigningKey()).update(`ticket:${registrationId}`).digest('base64url').slice(0, 22);
}

export function ticketToken(registrationId: string) {
    return `${registrationId}.${signature(registrationId)}`;
}

/** The registration id a token was issued for, or null if it was not issued by us. */
export function readTicketToken(token: string | undefined | null): string | null {
    if (!token || token.length > 120) return null;
    const [id, sig] = token.split('.');
    if (!id || !sig) return null;
    const expected = Buffer.from(signature(id));
    const given = Buffer.from(sig);
    return expected.length === given.length && timingSafeEqual(expected, given) ? id : null;
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
