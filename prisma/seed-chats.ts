/**
 * Example conversations between the example students from seed-dummy and
 * seed-showcase, so Messages has something in it: three direct chats and a
 * hackathon team group.
 *
 * Run everything with:  npm run seed:examples -- --yes
 *
 * Refuses to run unless SEED_EXAMPLES=1 is set (seed-examples sets it).
 * Safe to re-run: each conversation has a fixed id and is rebuilt in place,
 * with message times relative to now so the chats always look recent.
 */
import { PrismaClient } from '@prisma/client';

try {
    process.loadEnvFile('.env');
} catch {
    // No .env: rely on the environment as it is.
}

if (process.env.SEED_EXAMPLES !== '1') {
    console.log('seed-chats writes example conversations. Run it through: npm run seed:examples -- --yes');
    process.exit(1);
}

const prisma = new PrismaClient();
const MIN = 60 * 1000;

interface Chat {
    id: string;
    group?: { name: string };
    people: string[];
    /** [sender email, text, minutes ago] */
    lines: [string, string, number][];
}

const CHATS: Chat[] = [
    {
        id: 'example-chat-aditya-harsh',
        people: ['aditya@iitmumbai.edu', 'harsh@iitmumbai.edu'],
        lines: [
            ['harsh@iitmumbai.edu', 'Are you going to HackOverflow next month?', 190],
            ['aditya@iitmumbai.edu', 'Registered yesterday. Still need a hardware person though', 182],
            ['harsh@iitmumbai.edu', 'I have an ESP32 kit and zero plans that weekend', 175],
            ['aditya@iitmumbai.edu', 'Perfect. Drone telemetry dashboard? I do the Rust backend, you do the board', 168],
            ['harsh@iitmumbai.edu', 'Deal. Let us sketch it out at the CodeCraft meetup on Thursday', 41],
        ],
    },
    {
        id: 'example-chat-aditya-ishita',
        people: ['aditya@iitmumbai.edu', 'ishita@nid.edu'],
        lines: [
            ['aditya@iitmumbai.edu', 'Hey! Saw your poster series on Buzz. Would you design our hackathon deck?', 1500],
            ['ishita@nid.edu', 'Happy to. What is the vibe? Brutalist or friendly?', 1460],
            ['aditya@iitmumbai.edu', 'Friendly, but it should look like we know what we are doing', 1452],
            ['ishita@nid.edu', 'Ha. Send me the outline and I will have a first pass by Sunday', 1440],
        ],
    },
    {
        id: 'example-chat-aditya-sameer',
        people: ['aditya@iitmumbai.edu', 'sameer@vit.edu'],
        lines: [
            ['sameer@vit.edu', 'Your Intro to Rust workshop is on the 31st, right? Can VIT folks join online?', 2900],
            ['aditya@iitmumbai.edu', 'Yes, we will stream it. I will DM you the link the day before', 2880],
        ],
    },
    {
        id: 'example-chat-team-telemetry',
        group: { name: 'Team Telemetry · HackOverflow' },
        people: ['aditya@iitmumbai.edu', 'harsh@iitmumbai.edu', 'fatima@bits.edu', 'ishita@nid.edu'],
        lines: [
            ['aditya@iitmumbai.edu', 'Made a group for the four of us. Welcome to Team Telemetry', 300],
            ['fatima@bits.edu', 'Hello! I can bring the mechanical side, I have a spare quad frame', 290],
            ['ishita@nid.edu', 'I will handle the dashboard UI and the pitch deck', 284],
            ['harsh@iitmumbai.edu', 'Firmware and radio on me', 280],
            ['aditya@iitmumbai.edu', 'Kickoff call Friday at 9 pm?', 22],
            ['fatima@bits.edu', 'Works for me', 12],
        ],
    },
];

async function main() {
    const emails = [...new Set(CHATS.flatMap((c) => c.people))];
    const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true, email: true } });
    const idFor = new Map(users.map((u) => [u.email, u.id]));
    const missing = emails.filter((e) => !idFor.has(e));
    if (missing.length) {
        console.log(`seed-chats: skipping, example students not found (${missing.join(', ')}). Run seed-showcase first.`);
        return;
    }

    const now = Date.now();
    for (const chat of CHATS) {
        const last = Math.min(...chat.lines.map((l) => l[2]));
        await prisma.conversation.deleteMany({ where: { id: chat.id } });
        await prisma.conversation.create({
            data: {
                id: chat.id,
                isGroup: !!chat.group,
                name: chat.group?.name ?? null,
                createdAt: new Date(now - Math.max(...chat.lines.map((l) => l[2])) * MIN - MIN),
                updatedAt: new Date(now - last * MIN),
                participants: {
                    create: chat.people.map((email, i) => ({
                        userId: idFor.get(email)!,
                        role: chat.group && i === 0 ? 'ADMIN' : 'MEMBER',
                        // Everyone has read up to the latest message except the
                        // first person, who has the last one waiting.
                        lastReadAt: new Date(now - (i === 0 ? last + 1 : last - 1) * MIN),
                    })),
                },
                messages: {
                    create: chat.lines.map(([email, content, ago]) => ({
                        senderId: idFor.get(email)!,
                        content,
                        createdAt: new Date(now - ago * MIN),
                    })),
                },
            },
        });
    }
    console.log(`seed-chats: ${CHATS.length} example conversations ready.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
