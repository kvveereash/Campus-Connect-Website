import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // 1. Create Default College
    const COLLEGE_NAME = 'Apex University';

    let college = await prisma.college.findFirst({
        where: { OR: [{ name: 'Default College' }, { name: COLLEGE_NAME }] }
    });

    if (college) {
        if (college.name === 'Default College') {
            college = await prisma.college.update({
                where: { id: college.id },
                data: { name: COLLEGE_NAME }
            });
            console.log('✅ Renamed Default College to:', college.name);
        }
    } else {
        college = await prisma.college.create({
            data: {
                name: COLLEGE_NAME,
                location: 'Campus City',
                logo: '/images/college-placeholder.png',
                description: 'A premier institute for technology and arts.',
            },
        });
        console.log('✅ Created college:', college.name);
    }

    // Fix any colleges with broken default logo
    const updateResult = await prisma.college.updateMany({
        where: { logo: '/images/default-college-logo.png' },
        data: { logo: '/images/college-placeholder.png' }
    });

    if (updateResult.count > 0) {
        console.log(`✅ Fixed logo for ${updateResult.count} colleges`);
    }

    // 2. Create Badges
    const badges = [
        { name: 'Social Butterfly', description: 'Register for 5 events', icon: '🦋' },
        { name: 'Code Ninja', description: 'Register for a Hackathon', icon: '🥷' },
        { name: 'Event Planner', description: 'Host an event', icon: '📅' },
    ];

    for (const badge of badges) {
        await prisma.badge.upsert({
            where: { name: badge.name },
            update: {},
            create: badge,
        });
    }
    console.log('✅ Badges created');

    // 3. Create Sample Users
    const password = await bcrypt.hash('password123', 10);

    // Helper to create skills/interests relations
    const connectTags = (tags: string[]) => {
        return {
            connectOrCreate: tags.map(tag => ({
                where: { name: tag },
                create: { name: tag }
            }))
        };
    };

    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@campus.edu' },
        update: {},
        create: {
            email: 'admin@campus.edu',
            name: 'Admin User',
            password,
            role: 'ADMIN',
            collegeId: college.id,
            bio: 'System Administrator',
        },
    });

    const techLead = await prisma.user.upsert({
        where: { email: 'tech@campus.edu' },
        update: {},
        create: {
            email: 'tech@campus.edu',
            name: 'Alex Techie',
            password,
            role: 'USER',
            collegeId: college.id,
            bio: 'Tech Enthusiast and Coding Wizard',
            interests: connectTags(['Coding', 'Hackathons', 'AI']),
            skills: connectTags(['React', 'Node.js', 'Python']),
        },
    });

    const artLead = await prisma.user.upsert({
        where: { email: 'art@campus.edu' },
        update: {},
        create: {
            email: 'art@campus.edu',
            name: 'Sarah Artist',
            password,
            role: 'USER',
            collegeId: college.id,
            bio: 'Creative soul',
            interests: connectTags(['Painting', 'Design', 'Music']),
            skills: connectTags(['Photoshop', 'Procreate']),
        },
    });
    console.log('✅ Users created');

    // 4. Create Clubs
    const clubs = [
        {
            name: 'Campus Tech Club',
            description: 'For all things technology, coding, and innovation.',
            category: 'Technology',
            logo: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=500',
            verified: true,
            founderId: techLead.id,
        },
        {
            name: 'Creative Arts Society',
            description: 'Express yourself through art, music, and performance.',
            category: 'Art',
            logo: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=600&q=80',
            verified: true,
            founderId: artLead.id,
        },
        {
            name: 'Varsity Sports',
            description: 'Competitive sports teams and fitness activities.',
            category: 'Sports',
            logo: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&q=80&w=500',
            verified: true,
            founderId: adminUser.id,
        }
    ];

    const createdClubs = [];
    for (const clubData of clubs) {
        const existing = await prisma.club.findFirst({ where: { name: clubData.name } });
        if (!existing) {
            const club = await prisma.club.create({
                data: {
                    name: clubData.name,
                    description: clubData.description,
                    category: clubData.category,
                    logo: clubData.logo,
                    verified: clubData.verified,
                    collegeId: college.id, // Explicitly connect college
                    members: {
                        create: {
                            userId: clubData.founderId,
                            role: 'ADMIN' // Founder is Admin
                        }
                    }
                }
            });
            createdClubs.push(club);
        } else {
            createdClubs.push(existing);
        }
    }
    console.log('✅ Clubs created');

    // 5. Create Events
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(now.getMonth() + 1);

    // Helper to format event data for creation
    const createEventData = (event: any, clubId: string) => ({
        title: event.title,
        description: event.description,
        date: event.date,
        venue: event.location, // Map location to venue
        category: event.category,
        price: event.price,
        thumbnail: event.image, // Map image to thumbnail
        creatorId: event.creatorId,
        hostCollegeId: college!.id,
        clubId: clubId,
        verified: event.verified,
    });

    const events = [
        {
            title: 'Annual Hackathon 2026',
            description: 'Join us for 24 hours of coding, pizza, and prizes! Build something amazing.',
            date: nextMonth,
            location: 'Student Center Hall A',
            category: 'Technology',
            price: 0,
            image: 'https://images.unsplash.com/photo-1504384308090-c54be3855833?auto=format&fit=crop&q=80&w=1000',
            creatorId: techLead.id,
            clubId: createdClubs[0]?.id,
            verified: true,
        },
        {
            title: 'Spring Art Exhibition',
            description: 'Showcasing the best student artwork from around campus.',
            date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
            location: 'Gallery Room 202',
            category: 'Art',
            price: 5.00,
            image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=1000',
            creatorId: artLead.id,
            clubId: createdClubs[1]?.id,
            verified: true,
        },
        {
            title: 'Tech Talk: Future of AI',
            description: 'Industry experts discuss the implications of AGI.',
            date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
            location: 'Auditorium',
            category: 'Technology',
            price: 0,
            image: null,
            creatorId: techLead.id,
            clubId: createdClubs[0]?.id,
            verified: true,
        },
        {
            title: 'Fitness Bootcamp',
            description: 'Get in shape with our intense morning workout session.',
            date: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Yesterday (Past event)
            location: 'Campus Gym',
            category: 'Sports',
            price: 10.00,
            image: null,
            creatorId: adminUser.id,
            clubId: createdClubs[2]?.id,
            verified: true,
        }
    ];

    for (const event of events) {
        if (!event.clubId) continue;

        const existing = await prisma.event.findFirst({ where: { title: event.title } });
        if (!existing) {
            await prisma.event.create({
                data: createEventData(event, event.clubId)
            });
        }
    }
    console.log('✅ Events created');

    // 6. Connect Default Admin to all badges for testing
    const allBadges = await prisma.badge.findMany();
    for (const badge of allBadges) {
        // userBadge has @@unique([userId, badgeId]) so upsert works
        await prisma.userBadge.upsert({
            where: {
                userId_badgeId: {
                    userId: adminUser.id,
                    badgeId: badge.id
                }
            },
            update: {},
            create: {
                userId: adminUser.id,
                badgeId: badge.id
            }
        });
    }

    console.log('🎉 Seeding complete!');
    console.log('--------------------------------');
    console.log('Admin User: admin@campus.edu / password123');
    console.log('Tech User: tech@campus.edu / password123');
    console.log('--------------------------------');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
