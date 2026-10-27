'use server';

import QRCode from 'qrcode';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { GOING, canManageEvent, checkInUrl, readTicketToken } from '@/lib/ticket';

const isId = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 40;

/**
 * The signed-in student's ticket for an event: a QR code of the check-in link
 * and a short code to read out if the camera will not focus. Null when they
 * are not going (no registration, or a paid one not yet paid).
 */
export async function getMyTicket(eventId: string) {
    const session = await getSession();
    if (!session?.userId || !isId(eventId)) return null;

    const registration = await prisma.eventRegistration.findFirst({
        where: { eventId, userId: session.userId, status: { in: [...GOING] }, event: { deletedAt: null } },
        select: { id: true, checkedInAt: true },
    });
    if (!registration) return null;

    const url = checkInUrl(eventId, registration.id);
    if (!url) return null; // tickets are off until TICKET_SECRET is set

    const qrSvg = await QRCode.toString(url, {
        type: 'svg',
        margin: 0,
        errorCorrectionLevel: 'M',
        color: { dark: '#111114', light: '#ffffff' }, // --color-obsidian on --color-paper: scanners want plain contrast
    });

    return {
        code: registration.id.slice(-6).toUpperCase(),
        qrSvg,
        checkedInAt: registration.checkedInAt?.toISOString() ?? null,
    };
}

/* Marks one registration as arrived. Idempotent: a second scan of the same
   ticket changes nothing, so the first arrival time is the one kept. */
async function checkIn(eventId: string, registrationId: string) {
    const session = await getSession();
    if (!session?.userId) return;

    const event = await prisma.event.findFirst({
        where: { id: eventId, deletedAt: null },
        select: { id: true, creatorId: true, clubId: true },
    });
    if (!event || !(await canManageEvent(event, session))) return;

    await prisma.eventRegistration.updateMany({
        where: { id: registrationId, eventId, status: { in: [...GOING] }, checkedInAt: null },
        data: { checkedInAt: new Date() },
    });

    revalidatePath(`/events/${eventId}/check-in`);
    revalidatePath(`/events/${eventId}/attendees`);
}

/** From the page a scanned QR code opens. */
export async function checkInWithTicket(eventId: string, token: string) {
    const registrationId = readTicketToken(token);
    if (!isId(eventId) || !registrationId) return;
    await checkIn(eventId, registrationId);
}

/** From the attendee list, for a phone that will not scan. */
export async function checkInFromList(eventId: string, registrationId: string) {
    if (!isId(eventId) || !isId(registrationId)) return;
    await checkIn(eventId, registrationId);
}
