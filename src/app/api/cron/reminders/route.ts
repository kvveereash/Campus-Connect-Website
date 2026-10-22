import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { refuseUnlessCron } from '@/lib/cron';
import { logger } from '@/lib/logger';
import { formatIST } from '@/lib/format';
import { sendEmail } from '@/lib/email';
import { escapeHtml } from '@/lib/sanitize';
import { SITE_URL } from '@/lib/site';

/*
 * The day-before reminder. netlify/functions/event-reminders.mjs calls this
 * every hour with CRON_SECRET; each run finds events starting in the next 24
 * hours and reminds everyone going who has not been reminded yet.
 *
 * Each registration is claimed by setting reminderSentAt in a single
 * UPDATE ... RETURNING before anything is sent. Checking for an existing
 * notification first, as this used to, let two overlapping runs both see
 * "not reminded" and both send.
 */

const WINDOW_MS = 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
    const refused = refuseUnlessCron(request);
    if (refused) return refused;

    const now = new Date();
    const events = await prisma.event.findMany({
        where: { verified: true, deletedAt: null, date: { gt: now, lte: new Date(now.getTime() + WINDOW_MS) } },
        select: { id: true, title: true, date: true, venue: true },
        take: 200,
    });

    let sent = 0;
    for (const event of events) {
        const link = `/events/${event.id}`;
        // The statuses are GOING (src/lib/ticket.ts) written as literals:
        // bound parameters would be text, which Postgres will not compare
        // with the enum column.
        const claimed = await prisma.$queryRaw<{ userId: string }[]>`
            UPDATE "EventRegistration"
            SET "reminderSentAt" = NOW()
            WHERE "eventId" = ${event.id}
              AND "status" IN ('PAID', 'COMPLETED')
              AND "reminderSentAt" IS NULL
            RETURNING "userId"`;
        if (claimed.length === 0) continue;
        const due = (
            await prisma.user.findMany({
                where: { id: { in: claimed.map((c) => c.userId) } },
                select: { id: true, email: true, name: true },
            })
        ).map((user) => ({ userId: user.id, user }));

        const when = `${formatIST(event.date, { weekday: 'long' })} at ${formatIST(event.date, { hour: 'numeric', minute: '2-digit' })}`;
        await prisma.notification.createMany({
            data: due.map((r) => ({
                recipientId: r.userId,
                type: 'EVENT_REMINDER' as const,
                message: `reminds you: ${event.title} is ${when}, at ${event.venue}.`,
                link,
            })),
        });
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
