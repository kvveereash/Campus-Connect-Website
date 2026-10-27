import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import prisma from '@/lib/db';
import { SITE_URL } from '@/lib/site';

/*
 * Tickets for QR check-in. A ticket is the registration id plus an HMAC of
 * it, so the QR code cannot be made up from a guessed id, and it never
 * expires: a screenshot taken the night before still works at the door.
 *
 * Signed with TICKET_SECRET, not the session key. Sharing that key meant
 * rotating it to sign everyone out also voided every ticket, and a leak of
 * it let someone forge tickets as well as sessions.
 */

/** Registrations that count as going: free sign-ups and paid ones. */
export const GOING = ['PAID', 'COMPLETED'] as const;

const MIN_SECRET_LENGTH = 32;

/* Null in production until TICKET_SECRET is set: tickets are then off (no
   QR shown, every scan refused) rather than signed with a stand-in key. */
function ticketKey(): Buffer | null {
    const secret = process.env.TICKET_SECRET;
    if (secret && secret.length >= MIN_SECRET_LENGTH) return Buffer.from(secret);
    if (process.env.NODE_ENV !== 'production') return Buffer.from('dev-only-ticket-secret-not-for-production');
    return null;
}

export const ticketsEnabled = () => ticketKey() !== null;

/* The same key signs tickets, certificate links and calendar feeds, each with
   its own purpose in the message, so a certificate link can never be passed
   off as a ticket (or the other way round). */
type Purpose = 'ticket' | 'certificate' | 'calendar' | 'digest';

function signature(purpose: Purpose, id: string, key: Buffer) {
    return createHmac('sha256', key).update(`${purpose}:${id}`).digest('base64url').slice(0, 22);
}

function sign(purpose: Purpose, id: string) {
    const key = ticketKey();
    return key ? `${id}.${signature(purpose, id, key)}` : null;
}

function read(purpose: Purpose, token: string | undefined | null): string | null {
    const key = ticketKey();
    if (!key || !token || token.length > 120) return null;
    const [id, sig] = token.split('.');
    if (!id || !sig) return null;
    const expected = Buffer.from(signature(purpose, id, key));
    const given = Buffer.from(sig);
    return expected.length === given.length && timingSafeEqual(expected, given) ? id : null;
}

/** Null when tickets are off. */
export const ticketToken = (registrationId: string) => sign('ticket', registrationId);
/** The registration id a token was issued for, or null if it was not issued by us. */
export const readTicketToken = (token: string | undefined | null) => read('ticket', token);

/** The public "check this certificate" link's token, for a checked-in registration. */
export const certificateToken = (registrationId: string) => sign('certificate', registrationId);
export const readCertificateToken = (token: string | undefined | null) => read('certificate', token);

/** A person's private calendar feed address. Anyone holding it sees their events, nothing else. */
export const calendarFeedToken = (userId: string) => sign('calendar', userId);
export const readCalendarFeedToken = (token: string | undefined | null) => read('calendar', token);

// The one-click unsubscribe link in the weekly digest email.
export const digestUnsubscribeToken = (userId: string) => sign('digest', userId);
export const readDigestUnsubscribeToken = (token: string | undefined | null) => read('digest', token);

/** The link an organiser's phone camera opens when it reads the QR code; null when tickets are off. */
export function checkInUrl(eventId: string, registrationId: string) {
    const token = ticketToken(registrationId);
    if (!token) return null;
    // Locally this points at the dev server, so scanning can be tried there.
    const base = process.env.NEXT_PUBLIC_APP_URL || SITE_URL;
    return `${base}/events/${eventId}/check-in?t=${encodeURIComponent(token)}`;
}

/**
 * Whether this user runs the event: its creator, an admin of the club hosting
 * it, or a site admin. Check-in and the attendee list are theirs alone.
 */
export async function canManageEvent(
    event: { id?: string; creatorId: string | null; clubId: string | null },
    session: { userId: string; user?: { role?: string } } | null,
) {
    if (!session?.userId) return false;
    if (session.user?.role === 'ADMIN' || event.creatorId === session.userId) return true;
    // Co-organisers the creator added (needs the event id to look them up).
    const [member, organiser] = await Promise.all([
        event.clubId
            ? prisma.clubMember.findUnique({
                  where: { userId_clubId: { userId: session.userId, clubId: event.clubId } },
                  select: { role: true },
              })
            : null,
        event.id
            ? prisma.eventOrganiser.findUnique({
                  where: { eventId_userId: { eventId: event.id, userId: session.userId } },
                  select: { id: true },
              })
            : null,
    ]);
    return member?.role === 'ADMIN' || Boolean(organiser);
}
