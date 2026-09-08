/**
 * Seeds the Campus Buzz feed with club posts and replies.
 *
 * Run with:  npx tsx prisma/seed-buzz.ts
 *
 * Every post is attributed to someone who is genuinely a member of the club it
 * belongs to — createClubPost rejects non-members, so seeded rows that ignored
 * that would represent a state the app itself could never produce.
 *
 * Safe to re-run: it skips any post whose exact content already exists.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Seed {
    club: string;
    author: string;
    daysAgo: number;
    content: string;
    likes: number;
    replies?: { author: string; content: string; hoursAfter: number }[];
}

const SEEDS: Seed[] = [
    {
        club: 'AI Research Group',
        author: 'Vikram Reddy',
        daysAgo: 0.2,
        content:
            "Paper reading session moved to Thursday 6pm — we're going through the original Attention Is All You Need. No background needed, I'll walk through the maths slowly. Room B-204.",
        likes: 23,
        replies: [
            { author: 'Meera Joshi', content: 'Finally! Been meaning to actually read this properly.', hoursAfter: 2 },
            { author: 'Priya Mehta', content: 'Will there be a recording for people with labs Thursday evening?', hoursAfter: 5 },
        ],
    },
    {
        club: 'CodeCraft Society',
        author: 'Rahul Sharma',
        daysAgo: 0.6,
        content:
            'We are forming teams for HackOverflow. Looking for two more people comfortable with backend work — Node or Python, either is fine. Drop a comment if interested and I will add you to the group.',
        likes: 31,
        replies: [
            { author: 'Sneha Patil', content: 'I can do Python + Postgres. Count me in.', hoursAfter: 1 },
            { author: 'Ananya Iyer', content: 'Same here, mostly Node. What is the project idea?', hoursAfter: 4 },
        ],
    },
    {
        club: 'Shutterbugs Photography',
        author: 'Karthik Nair',
        daysAgo: 1.1,
        content:
            'Night photography walk this Saturday, meeting at the library steps at 7pm. Bring a tripod if you own one — if not, we have three spare and you can share. Beginners very welcome.',
        likes: 47,
        replies: [{ author: 'Meera Joshi', content: 'Borrowing a tripod, thanks for keeping spares.', hoursAfter: 3 }],
    },
    {
        club: 'Green Campus Initiative',
        author: 'Priya Mehta',
        daysAgo: 1.8,
        content:
            'Results from the cleanup drive: 62 volunteers, 140kg of waste collected, and roughly 40% of it was recyclable and should never have gone to landfill. Full breakdown going up on the noticeboard this week.',
        likes: 68,
        replies: [
            { author: 'Rahul Sharma', content: 'That recyclable number is depressing and useful. Good data.', hoursAfter: 6 },
        ],
    },
    {
        club: 'Model United Nations Club',
        author: 'Ananya Iyer',
        daysAgo: 2.4,
        content:
            'Position papers for the conference are due next Friday. If this is your first MUN, come to the Wednesday clinic — we go through structure and sourcing, and you leave with a draft rather than a blank page.',
        likes: 19,
    },
    {
        club: 'E-Sports Arena',
        author: 'Sneha Patil',
        daysAgo: 3.2,
        content:
            'Valorant inter-college brackets are out. We are seeded fourth, which is generous. Practice scrims Tuesday and Thursday, 8pm, and please actually turn up this time.',
        likes: 54,
        replies: [
            { author: 'Karthik Nair', content: 'Fourth is generous is doing a lot of work in that sentence.', hoursAfter: 2 },
            { author: 'Arjun Singh', content: 'I will be there Tuesday.', hoursAfter: 8 },
        ],
    },
    {
        club: 'The Quill — Literary Society',
        author: 'Arjun Singh',
        daysAgo: 4.1,
        content:
            'Open mic night was quietly one of the best we have run. Fourteen readers, two of whom had never read in public before. Next one is in three weeks — the sign-up sheet is already half full.',
        likes: 41,
        replies: [{ author: 'Meera Joshi', content: 'The last two readings genuinely stayed with me.', hoursAfter: 12 }],
    },
    {
        club: 'PixelPerfect Design Lab',
        author: 'Priya Mehta',
        daysAgo: 5.3,
        content:
            'Running a Figma basics workshop for anyone who keeps meaning to learn it. Two hours, no prior experience, we build one real screen together. Laptops required, bring a charger.',
        likes: 37,
        replies: [{ author: 'Vikram Reddy', content: 'Signed up. Have avoided learning this for two years.', hoursAfter: 5 }],
    },
    {
        club: 'Startup Incubator',
        author: 'Karthik Nair',
        daysAgo: 6.7,
        content:
            'Demo day pitches are five minutes plus three for questions. The most common mistake is spending four minutes on the problem — get to what you built by minute two. Slot booking opens Monday.',
        likes: 29,
    },
    {
        club: 'Rhythm & Blues Dance Crew',
        author: 'Meera Joshi',
        daysAgo: 8.2,
        content:
            'Auditions for the inter-college battle team are next week. Two rounds, prepare 90 seconds of anything you like. We care more about how you move than which style you trained in.',
        likes: 62,
        replies: [{ author: 'Arjun Singh', content: 'Any limit on how many people can audition?', hoursAfter: 20 }],
    },
];

async function main() {
    const [clubs, users] = await Promise.all([
        prisma.club.findMany({ select: { id: true, name: true } }),
        prisma.user.findMany({ select: { id: true, name: true } }),
    ]);

    const clubBy = new Map(clubs.map((c) => [c.name, c.id]));
    const userBy = new Map(users.map((u) => [u.name, u.id]));

    let created = 0;
    let skipped = 0;

    for (const seed of SEEDS) {
        const clubId = clubBy.get(seed.club);
        const authorId = userBy.get(seed.author);

        if (!clubId || !authorId) {
            console.warn(`  skip: missing club "${seed.club}" or user "${seed.author}"`);
            skipped++;
            continue;
        }

        // Guard against duplicates so the script can be re-run safely.
        const exists = await prisma.post.findFirst({ where: { content: seed.content } });
        if (exists) {
            skipped++;
            continue;
        }

        // Enforce the same rule the app does: only members may post.
        const membership = await prisma.clubMember.findUnique({
            where: { userId_clubId: { userId: authorId, clubId } },
        });
        if (!membership) {
            console.warn(`  skip: ${seed.author} is not a member of ${seed.club}`);
            skipped++;
            continue;
        }

        const timestamp = new Date(Date.now() - seed.daysAgo * 24 * 3600 * 1000);

        const post = await prisma.post.create({
            data: {
                content: seed.content,
                clubId,
                authorId,
                likes: seed.likes,
                comments: seed.replies?.length ?? 0,
                timestamp,
            },
        });

        for (const reply of seed.replies ?? []) {
            const replyAuthorId = userBy.get(reply.author);
            if (!replyAuthorId) continue;

            await prisma.comment.create({
                data: {
                    content: reply.content,
                    postId: post.id,
                    authorId: replyAuthorId,
                    timestamp: new Date(timestamp.getTime() + reply.hoursAfter * 3600 * 1000),
                },
            });
        }

        created++;
        console.log(`  + ${seed.club}: ${seed.content.slice(0, 52)}...`);
    }

    console.log(`\ncreated ${created} post(s), skipped ${skipped}`);
    console.log(`totals -> posts: ${await prisma.post.count()}, comments: ${await prisma.comment.count()}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
