import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { formatIST } from '@/lib/format';
import { sendEmail } from '@/lib/email';
import { escapeHtml } from '@/lib/sanitize';
import { SITE_URL } from '@/lib/site';
import { GOING } from '@/lib/ticket';

/*
 * The day-before reminder. netlify/functions/event-reminders.mjs calls this
 * every hour with CRON_SECRET; each run finds events starting in the next 24
 * hours and reminds everyone going who has not been reminded yet. "Already
 * reminded" is an existing EVENT_REMINDER notification for that event, so a
 * run that is retried, or overlaps the next one, sends nothing twice: the
 * check and the insert for each event run in one transaction holding an
 * advisory lock on that event, so an overlapping run waits, then sees the
 * rows the first one wrote. (A transaction-scoped lock, because the pooler
 * hands each transaction its own connection.) Email goes only to the
 * reminders this run inserted.
 */

const WINDOW_MS = 24 * 60 * 60 * 1000;

function authorised(request: Request) {
    const secret = process.env.CRON_SECRET;
    const given = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
    if (!secret || secret.length < 16) return false;
    const a = Buffer.from(given);
    const b = Buffer.from(secret);
    return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
    if (!process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Reminders are off: CRON_SECRET is not set.' }, { status: 503 });
    }
    if (!authorised(request)) return new NextResponse(null, { status: 401 });

    const now = new Date();
    const events = await prisma.event.findMany({
        where: { verified: true, deletedAt: null, date: { gt: now, lte: new Date(now.getTime() + WINDOW_MS) } },
        select: {
            id: true,
            title: true,
            date: true,
            venue: true,
            registrations: {
                where: { status: { in: [...GOING] } },
                select: { userId: true, user: { select: { email: true, name: true } } },
            },
        },
        take: 200,
    });

    let sent = 0;
    for (const event of events) {
        const link = `/events/${event.id}`;
        const when = `${formatIST(event.date, { weekday: 'long' })} at ${formatIST(event.date, { hour: 'numeric', minute: '2-digit' })}`;

        const due = await prisma.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`event-reminder:${event.id}`}))::text AS locked`;
            const already = await tx.notification.findMany({
                where: { type: 'EVENT_REMINDER', link, recipientId: { in: event.registrations.map((r) => r.userId) } },
                select: { recipientId: true },
            });
            const reminded = new Set(already.map((n) => n.recipientId));
            const fresh = event.registrations.filter((r) => !reminded.has(r.userId));
            if (fresh.length > 0) {
                await tx.notification.createMany({
                    data: fresh.map((r) => ({
                        recipientId: r.userId,
                        type: 'EVENT_REMINDER' as const,
                        message: `reminds you: ${event.title} is ${when}, at ${event.venue}.`,
                        link,
                    })),
                });
            }
            return fresh;
        });
        if (due.length === 0) continue;
        sent += due.length;

        // Email is best effort and only once Resend is configured; the in-app
        // reminder above is the one that always lands.
        await Promise.allSettled(
            due.map((r) =>
                sendEmail({
                    to: r.user.email,
                    subject: `Tomorrow: ${event.title}`,
                    text: `Hi ${r.user.name},\n\n${event.title} is ${when}, at ${event.venue}.\n\nYour ticket is on the event page: ${SITE_URL}${link}\n\nCampus Connect`,
                    html: `<p>Hi ${escapeHtml(r.user.name)},</p><p><strong>${escapeHtml(event.title)}</strong> is ${escapeHtml(when)}, at ${escapeHtml(event.venue)}.</p><p>Your ticket is on the <a href="${SITE_URL}${link}">event page</a>.</p><p>Campus Connect</p>`,
                }),
            ),
        );
    }

    logger.info('Event reminders sent', { events: events.length, reminders: sent });
    return NextResponse.json({ events: events.length, reminders: sent });
}
