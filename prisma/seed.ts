import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create default college
    const college = await prisma.college.upsert({
        where: { name: 'Default College' },
        update: {},
        create: {
            name: 'Default College',
            location: 'Campus City',
            logo: '/images/default-college-logo.png',
        },
    });

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
        await prisma.badge.upsert({
            where: { name: badge.name },
            update: {},
            create: badge,
        });
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
