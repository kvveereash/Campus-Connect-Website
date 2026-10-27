import prisma from '@/lib/db';
import { icsCalendar } from '@/lib/calendar';
import { GOING, readCalendarFeedToken } from '@/lib/ticket';

const DAY_MS = 24 * 60 * 60 * 1000;

/*
 * A person's calendar feed: every event they are going to, from a month ago
 * on. Calendar apps subscribe once and re-read it every few hours, so new
 * registrations appear on their own. The address is the only key (calendar
 * apps cannot send a session cookie), so it is signed and shows nothing but
 * that person's events.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const userId = readCalendarFeedToken(token.replace(/\.ics$/, ''));
    if (!userId) return new Response('This calendar link is not valid.', { status: 404 });

    const registrations = await prisma.eventRegistration.findMany({
        where: {
            userId,
            status: { in: [...GOING] },
            user: { deletedAt: null },
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
