import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { formatIST } from '@/lib/format';
import { canManageEvent } from '@/lib/ticket';

/*
 * The attendee list as a spreadsheet, for the organisers. The same fields the
 * attendee page shows (no emails or phone numbers), plus the waitlist and
 * each person's volunteer role.
 */

const STATUS: Record<string, string> = {
    COMPLETED: 'Going',
    PAID: 'Going (paid)',
    PENDING_PAYMENT: 'Not paid yet',
    WAITLISTED: 'Waitlist',
};

/* One CSV cell. A leading = + - @ (or tab) is how spreadsheet formulas start,
   so a name like "=HYPERLINK(...)" is made inert with a leading apostrophe. */
function cell(value: string) {
    const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getSession();
    const event = await prisma.event.findFirst({
        where: { id, deletedAt: null },
        select: { id: true, title: true, creatorId: true, clubId: true },
    });
    if (!event || !session?.userId || !(await canManageEvent(event, session))) {
        return new NextResponse('Only the organisers of this event can download its list.', { status: 403 });
    }

    const person = { select: { name: true, department: true, year: true, college: { select: { name: true } } } } as const;
    const [registrations, volunteers] = await Promise.all([
        prisma.eventRegistration.findMany({
            where: { eventId: id, status: { in: ['COMPLETED', 'PAID', 'PENDING_PAYMENT', 'WAITLISTED'] } },
            orderBy: { createdAt: 'asc' },
            take: 5000,
            select: { userId: true, status: true, createdAt: true, checkedInAt: true, user: person },
        }),
        prisma.volunteerSignup.findMany({
            where: { role: { eventId: id } },
            orderBy: { createdAt: 'asc' },
            select: { userId: true, createdAt: true, role: { select: { name: true } }, user: person },
        }),
    ]);
    // One role per person per event, so a person maps to at most one role.
    const roleOf = new Map(volunteers.map((v) => [v.userId, v.role.name]));
    const registered = new Set(registrations.map((r) => r.userId));

    const when = (d: Date | null) => (d ? `${formatIST(d, { day: '2-digit', month: 'short', year: 'numeric' })} ${formatIST(d, { hour: '2-digit', minute: '2-digit' })}` : '');
    const rows = [
        ['Name', 'College', 'Department', 'Year', 'Status', 'Volunteer role', 'Signed up (IST)', 'Checked in (IST)'],
        ...registrations.map((r) => [
            r.user.name,
            r.user.college?.name ?? '',
            r.user.department ?? '',
            r.user.year ?? '',
            STATUS[r.status] ?? r.status,
            roleOf.get(r.userId) ?? '',
            when(r.createdAt),
            when(r.checkedInAt),
        ]),
        // Volunteers need not register, but the desk still needs their names.
        ...volunteers
            .filter((v) => !registered.has(v.userId))
            .map((v) => [
                v.user.name,
                v.user.college?.name ?? '',
                v.user.department ?? '',
                v.user.year ?? '',
                'Volunteer only',
                v.role.name,
                when(v.createdAt),
                '',
            ]),
    ];
    // A byte-order mark so Excel reads the file as UTF-8 (names, ₹, scripts).
    const body = `﻿${rows.map((row) => row.map(cell).join(',')).join('\r\n')}\r\n`;
    const name = event.title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 50) || 'event';

    return new NextResponse(body, {
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="attendees-${name}.csv"`,
            'Cache-Control': 'private, no-store',
        },
    });
}
