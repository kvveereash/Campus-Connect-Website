import prisma from '@/lib/db';
import { passwordVersion } from '@/lib/auth';
import { icsCalendar } from '@/lib/calendar';
import { calendarFeedOwner, GOING, readCalendarFeedToken } from '@/lib/ticket';

const DAY_MS = 24 * 60 * 60 * 1000;

/*
 * A person's calendar feed: every event they are going to, from a month ago
 * on. Calendar apps subscribe once and re-read it every few hours, so new
 * registrations appear on their own. The address is the only key (calendar
 * apps cannot send a session cookie), so it is signed and shows nothing but
 * that person's events. Changing the password changes the address and ends
 * the old one.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const raw = token.replace(/\.ics$/, '');
    const ownerId = calendarFeedOwner(raw);
    const owner = ownerId
        ? await prisma.user.findFirst({ where: { id: ownerId, deletedAt: null }, select: { id: true, password: true } })
        : null;
    const userId = owner && readCalendarFeedToken(raw, passwordVersion(owner.password));
    if (!userId) {
        return new Response('This calendar link is no longer valid. Copy the current one from My events.', { status: 404 });
    }

    const registrations = await prisma.eventRegistration.findMany({
        where: {
            userId,
            status: { in: [...GOING] },
            event: { deletedAt: null, date: { gte: new Date(Date.now() - 30 * DAY_MS) } },
        },
        orderBy: { event: { date: 'asc' } },
        take: 200,
        select: {
            event: {
                select: { id: true, title: true, description: true, venue: true, date: true, hostCollege: { select: { name: true } } },
            },
        },
    });

    const body = icsCalendar(
        registrations.map(({ event }) => ({ ...event, collegeName: event.hostCollege.name })),
        'Campus Connect',
    );

    return new Response(body, {
        headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Cache-Control': 'private, max-age=900',
        },
    });
}
