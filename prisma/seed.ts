import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create default college
    // Create default college
    let college = await prisma.college.findFirst({
        where: { name: 'Default College' },
    });

    if (!college) {
        college = await prisma.college.create({
            data: {
                name: 'Default College',
                location: 'Campus City',
                logo: '/images/default-college-logo.png',
                description: 'A default college for testing purposes.',
            },
        });
    }

    console.log('✅ Created default college:', college.name);

    // Create some sample badges
    const badges = [
        {
            name: 'Social Butterfly',
            description: 'Register for 5 events',
            icon: '🦋',
        },
        {
            name: 'Code Ninja',
            description: 'Register for a Hackathon',
            icon: '🥷',
        },
        {
            name: 'Event Planner',
            description: 'Host an event',
            icon: '📅',
        },
    ];

    for (const badge of badges) {
        const existingBadge = await prisma.badge.findFirst({
            where: { name: badge.name },
        });

        if (!existingBadge) {
            await prisma.badge.create({
                data: badge,
            });
        }
    }

    console.log('✅ Created badges');
    console.log('🎉 Seeding complete!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
