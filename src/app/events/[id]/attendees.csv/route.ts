import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { formatIST } from '@/lib/format';
import { canManageEvent } from '@/lib/ticket';

/*
 * The attendee list as a spreadsheet, for the organisers. The same fields the
 * attendee page shows (no emails or phone numbers), plus the waitlist.
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

    const registrations = await prisma.eventRegistration.findMany({
        where: { eventId: id, status: { in: ['COMPLETED', 'PAID', 'PENDING_PAYMENT', 'WAITLISTED'] } },
        orderBy: { createdAt: 'asc' },
        take: 5000,
        select: {
            status: true,
            createdAt: true,
            checkedInAt: true,
            user: { select: { name: true, department: true, year: true, college: { select: { name: true } } } },
        },
    });

    const when = (d: Date | null) => (d ? `${formatIST(d, { day: '2-digit', month: 'short', year: 'numeric' })} ${formatIST(d, { hour: '2-digit', minute: '2-digit' })}` : '');
    const rows = [
        ['Name', 'College', 'Department', 'Year', 'Status', 'Signed up (IST)', 'Checked in (IST)'],
        ...registrations.map((r) => [
            r.user.name,
            r.user.college?.name ?? '',
            r.user.department ?? '',
            r.user.year ?? '',
            STATUS[r.status] ?? r.status,
            when(r.createdAt),
            when(r.checkedInAt),
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
