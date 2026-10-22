import 'server-only';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { DEMO_EMAIL, DEMO_REFUSAL, isDemoEmail } from '@/lib/demo-account';

/*
 * "Try the demo": one shared account a recruiter can open with a click, set up
 * to show the site working: a ticket to an upcoming event, an event of its own
 * with people signed up, a club it runs, and conversations.
 *
 * It can do what is harmless and private (register, check in, message the
 * people it already talks to, join a club, read notifications) and nothing
 * that is public, costs money or touches the account: those actions refuse it
 * (createProtectedAction does by default; the rest call demoRefusal()). Every
 * night resetDemo() puts it back exactly as it was.
 */

/** The refusal message when the signed-in account is the demo, else null. */
export async function demoRefusal(): Promise<string | null> {
    const session = await getSession();
    return isDemoEmail(session?.user?.email) ? DEMO_REFUSAL : null;
}

// Seeded students the demo talks to and who sign up for its event. They exist
// on the board already (prisma/seed-dummy.ts); any missing are skipped.
const PEER_EMAILS = ['priya@nid.edu', 'rahul@iitmumbai.edu', 'sneha@bits.edu', 'vikram@vit.edu', 'ananya@symbiosis.edu'];

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

/** 6:30 pm India time, `days` from today. */
function eveningIn(days: number) {
    const d = new Date(Date.now() + days * DAY);
    d.setUTCHours(13, 0, 0, 0); // 13:00 UTC = 18:30 IST
    return d;
}

/**
 * Puts the demo account back to its starting state, creating it the first
 * time. Safe to run at any moment: everything it made before is removed first.
 */
export async function resetDemo() {
    const now = Date.now();
    const [peersFound, club, ticketEvent, skills, interests] = await Promise.all([
        prisma.user.findMany({ where: { email: { in: PEER_EMAILS }, deletedAt: null }, select: { id: true, name: true } }),
        prisma.club.findFirst({
            where: { verified: true, deletedAt: null },
            orderBy: { createdAt: 'asc' },
            select: { id: true, name: true, collegeId: true },
        }),
        prisma.event.findFirst({
            where: { verified: true, deletedAt: null, price: 0, date: { gte: new Date(now + DAY) }, creator: { email: { not: DEMO_EMAIL } } },
            orderBy: { date: 'asc' },
            select: { id: true },
        }),
        prisma.skill.findMany({ where: { name: { in: ['React', 'TypeScript', 'UI Design', 'Public Speaking'] } }, select: { id: true } }),
        prisma.interest.findMany({ where: { name: { in: ['Hackathons', 'Design', 'Startups', 'Music'] } }, select: { id: true } }),
    ]);
    if (!club) throw new Error('resetDemo: no approved club to put the demo account in.');
    const peers = peersFound.slice(0, 5);

    const profile = {
        name: 'Aditi Demo',
        department: 'Computer Science',
        year: '3rd Year',
        bio: 'The demo account. Everything here resets every night, so click around freely.',
        avatar: null,
        collegeId: club.collegeId,
        role: 'USER' as const,
        deletedAt: null,
        lockedUntil: null,
        emailVerified: new Date(now),
        skills: { set: skills.map((s) => ({ id: s.id })) },
        interests: { set: interests.map((i) => ({ id: i.id })) },
    };
    const demo = await prisma.user.upsert({
        where: { email: DEMO_EMAIL },
        // A password nobody holds: the only way in is the demo button.
        create: { ...profile, email: DEMO_EMAIL, password: await bcrypt.hash(randomBytes(32).toString('base64url'), 10), skills: { connect: profile.skills.set }, interests: { connect: profile.interests.set } },
        update: profile,
        select: { id: true },
    });

    // ─── Clear everything the demo made or joined ───
    const touchedEvents = (
        await prisma.eventRegistration.findMany({ where: { userId: demo.id }, select: { eventId: true } })
    ).map((r) => r.eventId);

    await prisma.$transaction([
        prisma.conversation.deleteMany({ where: { participants: { some: { userId: demo.id } } } }),
        prisma.message.deleteMany({ where: { senderId: demo.id } }),
        prisma.notification.deleteMany({ where: { OR: [{ recipientId: demo.id }, { actorId: demo.id }] } }),
        prisma.event.deleteMany({ where: { creatorId: demo.id } }),
        prisma.eventRegistration.deleteMany({ where: { userId: demo.id } }),
        prisma.eventReview.deleteMany({ where: { userId: demo.id } }),
        prisma.teamRequest.deleteMany({ where: { creatorId: demo.id } }),
        prisma.comment.deleteMany({ where: { authorId: demo.id } }),
        prisma.post.deleteMany({ where: { authorId: demo.id } }),
        prisma.clubMember.deleteMany({ where: { userId: demo.id } }),
    ]);

    // ─── Build it again ───
    await prisma.clubMember.create({ data: { userId: demo.id, clubId: club.id, role: 'ADMIN' } });

    if (ticketEvent) {
        await prisma.eventRegistration.create({
            data: { userId: demo.id, eventId: ticketEvent.id, status: 'COMPLETED', amountPaid: 0, createdAt: new Date(now - 3 * DAY) },
        });
        touchedEvents.push(ticketEvent.id);
    }

    const ownEvent = await prisma.event.create({
        data: {
            title: 'Demo Night: Ship It in Three Hours',
            description:
                'Bring an idea and a laptop; leave with something that works. Teams of three, pizza at eight, demos at nine.\n\nThis is the demo account\'s own event: open Attendees to see who signed up, and the door page to check people in.',
            date: eveningIn(6),
            venue: 'Seminar Hall 2',
            category: 'Hackathon',
            price: 0,
            thumbnail: '/images/campus/build-sprint.jpg',
            verified: true,
            verifiedAt: new Date(now),
            hostCollegeId: club.collegeId,
            clubId: club.id,
            creatorId: demo.id,
            registrationCount: peers.length,
            registrations: {
                create: peers.map((p, i) => ({
                    userId: p.id,
                    status: 'COMPLETED' as const,
                    amountPaid: 0,
                    // Spread over the last week and a half, so the sign-up chart has a shape.
                    createdAt: new Date(now - (9 - i * 2) * DAY - i * 3 * HOUR),
                })),
            },
        },
        select: { id: true },
    });

    // Keep counts honest on the events whose demo registrations were removed or added.
    for (const eventId of new Set(touchedEvents)) {
        const going = await prisma.eventRegistration.count({ where: { eventId, status: { in: ['PAID', 'COMPLETED'] } } });
        await prisma.event.update({ where: { id: eventId }, data: { registrationCount: going } });
    }

    const [friend, second, third] = peers;
    if (friend) {
        await prisma.conversation.create({
            data: {
                participants: { create: [{ userId: demo.id }, { userId: friend.id, lastReadAt: new Date(now) }] },
                messages: {
                    create: [
                        { senderId: friend.id, content: 'Saw you are running Demo Night. Is it open to second years?', createdAt: new Date(now - 26 * HOUR) },
                        { senderId: demo.id, content: 'Yes, anyone. Teams of three, and we will match people who come alone.', createdAt: new Date(now - 25 * HOUR) },
                        { senderId: friend.id, content: 'Perfect. I signed up. Can I bring Figma mockups instead of code?', createdAt: new Date(now - 3 * HOUR) },
                    ],
                },
            },
        });
    }
    if (second && third) {
        await prisma.conversation.create({
            data: {
                isGroup: true,
                name: 'Demo Night crew',
                participants: { create: [{ userId: demo.id, role: 'ADMIN' }, { userId: second.id }, { userId: third.id }] },
                messages: {
                    create: [
                        { senderId: demo.id, content: 'Hall is booked for six. Who can bring an extension board?', createdAt: new Date(now - 30 * HOUR) },
                        { senderId: second.id, content: 'I have two. Also asked the canteen about pizza.', createdAt: new Date(now - 29 * HOUR) },
                        { senderId: third.id, content: 'I will set up the projector and the judging sheet.', createdAt: new Date(now - 5 * HOUR) },
                    ],
                },
            },
        });
    }

    await prisma.notification.createMany({
        data: peers.slice(0, 3).map((p, i) => ({
            recipientId: demo.id,
            actorId: p.id,
            type: 'EVENT_JOIN' as const,
            message: 'registered for your event: Demo Night: Ship It in Three Hours',
            link: `/events/${ownEvent.id}`,
            createdAt: new Date(now - (i + 1) * 7 * HOUR),
        })),
    });

    return { userId: demo.id, eventId: ownEvent.id };
}
