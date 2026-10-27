import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { certificatePdf } from '@/lib/certificate';
import { certificateToken, GOING } from '@/lib/ticket';
import { SITE_URL } from '@/lib/site';

/*
 * Your participation certificate for an event, as a PDF download. Only for
 * someone the organiser checked in at the door: registering is not attending.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getSession();
    if (!session?.userId) {
        return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(`/events/${id}`)}`, request.url));
    }

    const registration = await prisma.eventRegistration.findFirst({
        where: {
            eventId: id,
            userId: session.userId,
            status: { in: [...GOING] },
            checkedInAt: { not: null },
            event: { deletedAt: null },
        },
        select: {
            id: true,
            checkedInAt: true,
            user: { select: { name: true } },
            event: {
                select: {
                    title: true,
                    date: true,
                    club: { select: { name: true } },
                    hostCollege: { select: { name: true } },
                },
            },
        },
    });
    if (!registration?.checkedInAt) {
        return new NextResponse('A certificate is ready once the organiser has checked you in at the event.', { status: 404 });
    }

    const token = certificateToken(registration.id);
    if (!token) return new NextResponse('Certificates are not set up on this site yet.', { status: 503 });

    const { event } = registration;
    const pdf = await certificatePdf({
        name: registration.user.name,
        eventTitle: event.title,
        host: event.club?.name ?? event.hostCollege.name,
        college: event.club ? event.hostCollege.name : '',
        date: event.date,
        checkedInAt: registration.checkedInAt,
        verifyUrl: `${process.env.NEXT_PUBLIC_APP_URL || SITE_URL}/certificates/${token}`,
        code: registration.id.slice(-8).toUpperCase(),
    });

    const slug = event.title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 50) || 'event';
    return new NextResponse(Buffer.from(pdf), {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="certificate-${slug}.pdf"`,
            'Cache-Control': 'private, no-store',
        },
    });
}
