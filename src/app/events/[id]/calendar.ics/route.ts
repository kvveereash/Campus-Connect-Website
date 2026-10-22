import prisma from '@/lib/db';
import { icsFile } from '@/lib/calendar';

// The file for one event, opened by Apple Calendar, Outlook and the rest.
// Approved, live events only: the same rule as the public page.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const event = await prisma.event.findFirst({
        where: { id, verified: true, deletedAt: null },
        select: { id: true, title: true, description: true, venue: true, date: true, hostCollege: { select: { name: true } } },
    });
    if (!event) return new Response('This event is not open to the public.', { status: 404 });

    const body = icsFile({ ...event, collegeName: event.hostCollege.name });
    // A filename people recognise in their downloads, from the title.
    const name = event.title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'event';

    return new Response(body, {
        headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': `attachment; filename="${name}.ics"`,
            'Cache-Control': 'public, max-age=300',
        },
    });
}
