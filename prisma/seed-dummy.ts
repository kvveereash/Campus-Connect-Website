import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding dummy data...');

    const password = await bcrypt.hash('password123', 10);

    // ─── Colleges ───
    const colleges = [
        {
            name: 'Indian Institute of Technology, Mumbai',
            location: 'Mumbai, Maharashtra',
            logo: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=200&q=80',
            description: 'One of India\'s premier engineering institutions known for cutting-edge research and innovation.',
        },
        {
            name: 'National Institute of Design, Ahmedabad',
            location: 'Ahmedabad, Gujarat',
            logo: 'https://images.unsplash.com/photo-1523050854058-8df90110c476?auto=format&fit=crop&w=200&q=80',
            description: 'India\'s leading design school fostering creativity and design thinking.',
        },
        {
            name: 'Delhi University — North Campus',
            location: 'New Delhi, Delhi',
            logo: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=200&q=80',
            description: 'Historic university with a vibrant student culture and diverse academic offerings.',
        },
        {
            name: 'BITS Pilani — Goa Campus',
            location: 'Zuarinagar, Goa',
            logo: 'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?auto=format&fit=crop&w=200&q=80',
            description: 'A top-tier engineering and science institution by the beautiful coast of Goa.',
        },
        {
            name: 'Christ University, Bangalore',
            location: 'Bangalore, Karnataka',
            logo: 'https://images.unsplash.com/photo-1580537659466-0a9bfa916a54?auto=format&fit=crop&w=200&q=80',
            description: 'A renowned multi-disciplinary university known for holistic education.',
        },
        {
            name: 'Symbiosis International, Pune',
            location: 'Pune, Maharashtra',
            logo: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?auto=format&fit=crop&w=200&q=80',
            description: 'A globally recognized institution promoting international understanding through quality education.',
        },
        {
            name: 'VIT University, Vellore',
            location: 'Vellore, Tamil Nadu',
            logo: 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=200&q=80',
            description: 'A premier technological university consistently ranked among India\'s best.',
        },
        {
            name: 'Manipal Academy of Higher Education',
            location: 'Manipal, Karnataka',
            logo: 'https://images.unsplash.com/photo-1519452635265-7b1fbfd1e4e0?auto=format&fit=crop&w=200&q=80',
            description: 'A multidisciplinary university known for its medical, engineering, and management programs.',
        },
    ];

    const createdColleges = [];
    for (const col of colleges) {
        const existing = await prisma.college.findFirst({ where: { name: col.name } });
        if (existing) {
            createdColleges.push(existing);
        } else {
            const created = await prisma.college.create({ data: col });
            createdColleges.push(created);
        }
    }
    console.log(`✅ ${createdColleges.length} colleges ready`);

    // ─── Users (one per college) ───
    const userTemplates = [
        { name: 'Rahul Sharma', email: 'rahul@iitmumbai.edu', bio: 'Full-stack developer & open source contributor', department: 'Computer Science', year: '3rd Year' },
        { name: 'Priya Mehta', email: 'priya@nid.edu', bio: 'UI/UX designer passionate about accessible design', department: 'Interaction Design', year: '2nd Year' },
        { name: 'Arjun Singh', email: 'arjun@du.edu', bio: 'Literature nerd and campus journalist', department: 'English Literature', year: '4th Year' },
        { name: 'Sneha Patil', email: 'sneha@bits.edu', bio: 'Robotics enthusiast and drone racer', department: 'Electrical Engineering', year: '3rd Year' },
        { name: 'Karthik Nair', email: 'karthik@christ.edu', bio: 'Startup founder & marketing geek', department: 'Business Administration', year: '2nd Year' },
        { name: 'Ananya Iyer', email: 'ananya@symbiosis.edu', bio: 'International relations student & MUN champion', department: 'Political Science', year: '3rd Year' },
        { name: 'Vikram Reddy', email: 'vikram@vit.edu', bio: 'ML researcher & Kaggle competitor', department: 'Data Science', year: '4th Year' },
        { name: 'Meera Joshi', email: 'meera@manipal.edu', bio: 'Pre-med student & dance team captain', department: 'Medicine', year: '2nd Year' },
    ];

    const createdUsers = [];
    for (let i = 0; i < userTemplates.length; i++) {
        const t = userTemplates[i];
        const existing = await prisma.user.findFirst({ where: { email: t.email } });
        if (existing) {
            createdUsers.push(existing);
        } else {
            const user = await prisma.user.create({
                data: {
                    name: t.name,
                    email: t.email,
                    password,
                    role: 'USER',
                    bio: t.bio,
                    department: t.department,
                    year: t.year,
                    collegeId: createdColleges[i].id,
                },
            });
            createdUsers.push(user);
        }
    }
    console.log(`✅ ${createdUsers.length} users ready`);

    // ─── Clubs ───
    const clubTemplates = [
        { name: 'CodeCraft Society', description: 'Competitive programming, hackathons, and open source development. We build things that matter.', category: 'Technology', logo: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=500&q=80', collegeIdx: 0, founderIdx: 0 },
        { name: 'PixelPerfect Design Lab', description: 'Where design meets technology. UI/UX workshops, design sprints, and portfolio reviews.', category: 'Art', logo: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=500&q=80', collegeIdx: 1, founderIdx: 1 },
        { name: 'The Quill — Literary Society', description: 'Poetry slams, book clubs, and creative writing workshops. Words have power.', category: 'Literature', logo: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=500&q=80', collegeIdx: 2, founderIdx: 2 },
        { name: 'RoboVerse', description: 'Building the future with robotics. From Arduino beginners to competition-level bots.', category: 'Technology', logo: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=500&q=80', collegeIdx: 3, founderIdx: 3 },
        { name: 'Startup Incubator', description: 'Turn your ideas into reality. Mentorship, funding support, and pitch competitions.', category: 'Business', logo: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=500&q=80', collegeIdx: 4, founderIdx: 4 },
        { name: 'Model United Nations Club', description: 'Debate, diplomacy, and global affairs. Representing nations, changing perspectives.', category: 'Social', logo: 'https://images.unsplash.com/photo-1523050854058-8df90110c476?auto=format&fit=crop&w=500&q=80', collegeIdx: 5, founderIdx: 5 },
        { name: 'AI Research Group', description: 'Deep learning, NLP, and computer vision research. Publish papers, win competitions.', category: 'Technology', logo: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=500&q=80', collegeIdx: 6, founderIdx: 6 },
        { name: 'Rhythm & Blues Dance Crew', description: 'Hip-hop, contemporary, and classical fusion. Perform at fests and compete nationally.', category: 'Art', logo: 'https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?auto=format&fit=crop&w=500&q=80', collegeIdx: 7, founderIdx: 7 },
        { name: 'Green Campus Initiative', description: 'Sustainability drives, tree plantations, and eco-awareness campaigns. Go green or go home.', category: 'Social', logo: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=500&q=80', collegeIdx: 0, founderIdx: 0 },
        { name: 'E-Sports Arena', description: 'Competitive gaming — Valorant, CS2, BGMI, and more. Weekly scrims and major tournaments.', category: 'Sports', logo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=500&q=80', collegeIdx: 3, founderIdx: 3 },
        { name: 'Shutterbugs Photography', description: 'Capture the world one frame at a time. Photowalks, editing workshops, and exhibitions.', category: 'Art', logo: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=500&q=80', collegeIdx: 4, founderIdx: 4 },
        { name: 'Debating Society', description: 'Sharpen your arguments and win with words. Parliamentary and Asian format debates.', category: 'Social', logo: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=500&q=80', collegeIdx: 2, founderIdx: 2 },
    ];

    const createdClubs = [];
    for (const ct of clubTemplates) {
        const existing = await prisma.club.findFirst({ where: { name: ct.name } });
        if (existing) {
            createdClubs.push(existing);
        } else {
            const club = await prisma.club.create({
                data: {
                    name: ct.name,
                    description: ct.description,
                    category: ct.category,
                    logo: ct.logo,
                    verified: true,
                    collegeId: createdColleges[ct.collegeIdx].id,
                    members: {
                        create: { userId: createdUsers[ct.founderIdx].id, role: 'ADMIN' },
                    },
                },
            });
            createdClubs.push(club);
        }
    }
    console.log(`✅ ${createdClubs.length} clubs ready`);

    // Add extra members to clubs for realism
    for (let i = 0; i < createdClubs.length; i++) {
        // Add 2-3 random members to each club
        const memberIndices = [(i + 1) % createdUsers.length, (i + 3) % createdUsers.length, (i + 5) % createdUsers.length];
        for (const mi of memberIndices) {
            try {
                await prisma.clubMember.create({
                    data: { userId: createdUsers[mi].id, clubId: createdClubs[i].id, role: 'MEMBER' },
                });
            } catch { /* already exists */ }
        }
    }
    console.log('✅ Club members added');

    // ─── Events ───
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;

    const eventTemplates = [
        { title: 'HackOverflow 2026', description: 'A 36-hour hackathon where teams of 4 build innovative solutions to real-world problems. ₹2L+ prize pool, swag kits, and mentorship from industry leaders.', date: new Date(now.getTime() + 14 * day), venue: 'Main Auditorium & Labs', category: 'Technology', price: 0, thumbnail: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1000&q=80', clubIdx: 0, creatorIdx: 0, collegeIdx: 0 },
        { title: 'Design Thinking Workshop', description: 'Learn the 5-stage design thinking process with hands-on exercises. Perfect for beginners and intermediate designers.', date: new Date(now.getTime() + 3 * day), venue: 'Design Studio, Block C', category: 'Workshop', price: 200, thumbnail: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1000&q=80', clubIdx: 1, creatorIdx: 1, collegeIdx: 1 },
        { title: 'Poetry Open Mic Night', description: 'An evening of spoken word, poetry, and storytelling. Open stage for all — bring your voice, leave your inhibitions.', date: new Date(now.getTime() + 5 * day), venue: 'Campus Amphitheatre', category: 'Cultural', price: 0, thumbnail: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=80', clubIdx: 2, creatorIdx: 2, collegeIdx: 2 },
        { title: 'RoboCup Campus Edition', description: 'Build & program robots to play soccer! All supplies provided. Teams of 3-5 compete for the campus championship.', date: new Date(now.getTime() + 21 * day), venue: 'Robotics Lab, Ground Floor', category: 'Technology', price: 500, thumbnail: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1000&q=80', clubIdx: 3, creatorIdx: 3, collegeIdx: 3 },
        { title: 'Pitch Perfect — Startup Demo Day', description: 'Watch 10 student startups pitch to a panel of VCs and angel investors. Networking dinner included.', date: new Date(now.getTime() + 7 * day), venue: 'Business School Auditorium', category: 'Business', price: 0, thumbnail: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=1000&q=80', clubIdx: 4, creatorIdx: 4, collegeIdx: 4 },
        { title: 'International MUN Conference', description: '3-day Model United Nations conference with 200+ delegates from 15 colleges. Committees: UNSC, UNHRC, Lok Sabha.', date: new Date(now.getTime() + 30 * day), venue: 'Convention Centre', category: 'Social', price: 1500, thumbnail: 'https://images.unsplash.com/photo-1523050854058-8df90110c476?auto=format&fit=crop&w=1000&q=80', clubIdx: 5, creatorIdx: 5, collegeIdx: 5 },
        { title: 'AI & ML Bootcamp', description: 'Intensive 2-day bootcamp covering Python, TensorFlow, and real-world ML projects. Certificate included.', date: new Date(now.getTime() + 10 * day), venue: 'Computer Lab 3, Block A', category: 'Technology', price: 300, thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1000&q=80', clubIdx: 6, creatorIdx: 6, collegeIdx: 6 },
        { title: 'Inter-College Dance Battle', description: 'Crews from 8 colleges battle it out on stage. Styles: Hip-hop, Popping, Contemporary, and Freestyle.', date: new Date(now.getTime() + 12 * day), venue: 'Cultural Centre Stage', category: 'Cultural', price: 100, thumbnail: 'https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?auto=format&fit=crop&w=1000&q=80', clubIdx: 7, creatorIdx: 7, collegeIdx: 7 },
        { title: 'Campus Cleanup Drive', description: 'Join us for a weekend cleanup mission. Gloves, bags, and refreshments provided. Make our campus greener!', date: new Date(now.getTime() + 2 * day), venue: 'Meet at Main Gate, 7:00 AM', category: 'Social', price: 0, thumbnail: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1000&q=80', clubIdx: 8, creatorIdx: 0, collegeIdx: 0 },
        { title: 'Valorant Inter-College Championship', description: '5v5 Valorant tournament. 32 teams battle for a ₹50K prize pool. Casting & live stream included.', date: new Date(now.getTime() + 18 * day), venue: 'E-Sports Room, Hostel Block', category: 'Sports', price: 250, thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1000&q=80', clubIdx: 9, creatorIdx: 3, collegeIdx: 3 },
        { title: 'Night Photography Walk', description: 'Explore the city at night through your lens. Guided walk with tips on long exposure, light trails, and street photography.', date: new Date(now.getTime() + 8 * day), venue: 'Meet at College Gate, 8 PM', category: 'Art', price: 0, thumbnail: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=1000&q=80', clubIdx: 10, creatorIdx: 4, collegeIdx: 4 },
        { title: 'The Great Debate — AI vs Humanity', description: 'Oxford-style debate on whether AI will replace human jobs. Guest judges from industry and academia.', date: new Date(now.getTime() + 4 * day), venue: 'Seminar Hall 2', category: 'Social', price: 0, thumbnail: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1000&q=80', clubIdx: 11, creatorIdx: 2, collegeIdx: 2 },
        { title: 'Web3 & Blockchain Summit', description: 'Talks, panels, and workshops on DeFi, NFTs, and smart contracts. Limited seats — register early!', date: new Date(now.getTime() + 25 * day), venue: 'Innovation Hub', category: 'Technology', price: 400, thumbnail: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1000&q=80', clubIdx: 0, creatorIdx: 0, collegeIdx: 0 },
        { title: 'Cultural Fest — Resonance 2026', description: 'The biggest annual fest! Live music, dance battles, food stalls, stand-up comedy, and star night with a surprise artist.', date: new Date(now.getTime() + 45 * day), venue: 'Entire Campus', category: 'Cultural', price: 500, thumbnail: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1000&q=80', clubIdx: 7, creatorIdx: 7, collegeIdx: 7 },
        { title: 'Resume & LinkedIn Workshop', description: 'Craft the perfect resume and LinkedIn profile. Get reviewed by recruiters from Google, Microsoft, and Amazon.', date: new Date(now.getTime() + 6 * day), venue: 'Placement Cell, 2nd Floor', category: 'Workshop', price: 0, thumbnail: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=1000&q=80', clubIdx: 4, creatorIdx: 4, collegeIdx: 4 },
    ];

    for (const et of eventTemplates) {
        const existing = await prisma.event.findFirst({ where: { title: et.title } });
        if (!existing && createdClubs[et.clubIdx]) {
            await prisma.event.create({
                data: {
                    title: et.title,
                    description: et.description,
                    date: et.date,
                    venue: et.venue,
                    category: et.category,
                    price: et.price,
                    thumbnail: et.thumbnail,
                    verified: true,
                    creatorId: createdUsers[et.creatorIdx].id,
                    clubId: createdClubs[et.clubIdx].id,
                    hostCollegeId: createdColleges[et.collegeIdx].id,
                },
            });
        }
    }
    console.log(`✅ ${eventTemplates.length} events ready`);

    // ─── Chat Rooms ───
    const chatRooms = [
        { name: 'General Chat', type: 'general', description: 'Open chat for all campus students' },
        { name: 'Tech Talk', type: 'topic', description: 'Discuss technology, coding, and gadgets' },
        { name: 'Events & Fests', type: 'topic', description: 'Coordinate event plans and share fest updates' },
        { name: 'Memes & Fun', type: 'topic', description: 'Share campus memes and have fun' },
    ];

    for (const room of chatRooms) {
        const existing = await prisma.chatRoom.findFirst({ where: { name: room.name } });
        if (!existing) {
            await prisma.chatRoom.create({ data: room });
        }
    }
    console.log('✅ Chat rooms ready');

    console.log('\n🎉 Dummy data seeded successfully!');
    console.log('────────────────────────────────');
    console.log('All dummy users have password: password123');
    console.log('Emails: rahul@iitmumbai.edu, priya@nid.edu, arjun@du.edu, etc.');
    console.log('────────────────────────────────');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
