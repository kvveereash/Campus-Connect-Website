/**
 * Fills the board with example activity on top of seed-dummy and seed-buzz:
 * more students, club memberships, hackathons and other events across every
 * category, registrations (so events show who is going), and team-finder
 * posts for the hackathons.
 *
 * Run everything with:  SEED_EXAMPLES=1 npm run seed:examples
 *
 * It writes example people and events into whatever DATABASE_URL points at,
 * so it refuses to run unless SEED_EXAMPLES=1 is set, and prints the host it
 * is about to write to. Safe to re-run: every row is looked up before it is
 * created, and past example events are moved forward again.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

try {
    process.loadEnvFile('.env');
} catch {
    // No .env: rely on the environment as it is.
}

/** The database host only. Never the full URL: it carries the password. */
function dbHost() {
    try {
        return new URL(process.env.DATABASE_URL ?? '').host || '(DATABASE_URL not set)';
    } catch {
        return '(DATABASE_URL unreadable)';
    }
}

const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const at = (days: number, hour: number, minute = 0) => {
    const d = new Date(Date.now() + days * DAY);
    // Times are written as IST and stored in UTC.
    d.setUTCHours(hour - 5, minute - 30, 0, 0);
    return d;
};
const photo = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=75`;

const STUDENTS = [
    { name: 'Aditya Rao', email: 'aditya@iitmumbai.edu', college: 'Indian Institute of Technology, Mumbai', department: 'Computer Science', year: '2nd Year', bio: 'Backend dev. Rust on weekends.' },
    { name: 'Ishita Banerjee', email: 'ishita@nid.edu', college: 'National Institute of Design, Ahmedabad', department: 'Communication Design', year: '3rd Year', bio: 'Type nerd, poster maker, occasional illustrator.' },
    { name: 'Rohan Gupta', email: 'rohan@du.edu', college: 'Delhi University — North Campus', department: 'Economics', year: '2nd Year', bio: 'Football on Sundays, debates the rest of the week.' },
    { name: 'Fatima Sheikh', email: 'fatima@bits.edu', college: 'BITS Pilani — Goa Campus', department: 'Mechanical Engineering', year: '3rd Year', bio: 'Building a combat robot that is mostly zip ties.' },
    { name: 'Nikhil Menon', email: 'nikhil@christ.edu', college: 'Christ University, Bangalore', department: 'Commerce', year: '1st Year', bio: 'Photographer. Will shoot your club event for chai.' },
    { name: 'Diya Kapoor', email: 'diya@symbiosis.edu', college: 'Symbiosis International, Pune', department: 'Mass Communication', year: '2nd Year', bio: 'Runs the campus radio. Ask me for a shoutout.' },
    { name: 'Sameer Khan', email: 'sameer@vit.edu', college: 'VIT University, Vellore', department: 'Information Technology', year: '3rd Year', bio: 'ML, Kaggle, and too much filter coffee.' },
    { name: 'Lakshmi Pillai', email: 'lakshmi@manipal.edu', college: 'Manipal Academy of Higher Education', department: 'Biotechnology', year: '2nd Year', bio: 'Bharatanatyam and bioinformatics.' },
    { name: 'Harsh Vardhan', email: 'harsh@iitmumbai.edu', college: 'Indian Institute of Technology, Mumbai', department: 'Electrical Engineering', year: '4th Year', bio: 'Embedded systems. Ask me about drones.' },
    { name: 'Zoya Mirza', email: 'zoya@du.edu', college: 'Delhi University — North Campus', department: 'English Literature', year: '3rd Year', bio: 'Slam poet. Book club regular.' },
];

/** Who joins which club. Names come from seed-dummy and STUDENTS above. */
const MEMBERSHIPS: Record<string, string[]> = {
    'CodeCraft Society': ['Aditya Rao', 'Harsh Vardhan', 'Sameer Khan', 'Fatima Sheikh', 'Ishita Banerjee'],
    'PixelPerfect Design Lab': ['Ishita Banerjee', 'Diya Kapoor', 'Nikhil Menon'],
    'The Quill — Literary Society': ['Zoya Mirza', 'Rohan Gupta', 'Diya Kapoor'],
    RoboVerse: ['Fatima Sheikh', 'Harsh Vardhan', 'Aditya Rao'],
    'Startup Incubator': ['Nikhil Menon', 'Diya Kapoor', 'Rohan Gupta', 'Sameer Khan'],
    'Model United Nations Club': ['Rohan Gupta', 'Zoya Mirza'],
    'AI Research Group': ['Sameer Khan', 'Aditya Rao', 'Lakshmi Pillai'],
    'Rhythm & Blues Dance Crew': ['Lakshmi Pillai', 'Diya Kapoor', 'Ishita Banerjee'],
    'Green Campus Initiative': ['Zoya Mirza', 'Lakshmi Pillai'],
    'E-Sports Arena': ['Harsh Vardhan', 'Rohan Gupta', 'Aditya Rao'],
    'Shutterbugs Photography': ['Nikhil Menon', 'Ishita Banerjee', 'Zoya Mirza'],
    'Debating Society': ['Rohan Gupta', 'Zoya Mirza', 'Diya Kapoor'],
};

interface EventSeed {
    title: string;
    description: string;
    date: Date;
    venue: string;
    category: string;
    price: number;
    thumbnail: string | null;
    club: string | null;
    college: string;
    creator: string;
}

/**
 * Some events carry no cover on purpose: the board renders a typeset
 * category poster for those, and a real board has both kinds.
 */
const EVENTS: EventSeed[] = [
    {
        title: 'Hack the Monsoon',
        description: 'A 24-hour hackathon on one theme: things that break when it rains. Teams of up to four, mentors on call through the night, and dinner, midnight Maggi and breakfast on us.',
        date: at(9, 9), venue: 'Lecture Hall Complex, IIT Bombay', category: 'Hackathon', price: 0,
        thumbnail: '/images/events/hack-the-monsoon.jpg', club: 'CodeCraft Society',
        college: 'Indian Institute of Technology, Mumbai', creator: 'Rahul Sharma',
    },
    {
        title: 'Build for Bharat: 36-hour Hackathon',
        description: 'Ship something for the next hundred million internet users: vernacular, low bandwidth, cheap phones. ₹1.5L in prizes across three tracks.',
        date: at(16, 10), venue: 'Technology Tower, VIT Vellore', category: 'Hackathon', price: 199,
        thumbnail: photo('1756273343749-63f7d6ea0cda'), club: 'AI Research Group',
        college: 'VIT University, Vellore', creator: 'Vikram Reddy',
    },
    {
        title: 'CTF Night: Capture the Flag',
        description: 'Beginner-friendly security CTF. Crypto, web and forensics challenges, with walkthroughs at midnight for anyone stuck.',
        date: at(4, 20), venue: 'Computer Centre, Lab 2', category: 'Hackathon', price: 0,
        thumbnail: '/images/events/ctf-night.jpg', club: 'CodeCraft Society',
        college: 'Indian Institute of Technology, Mumbai', creator: 'Aditya Rao',
    },
    {
        title: 'Figma to Production: UI Sprint',
        description: 'Take one screen from a Figma file to a working page in an afternoon. Bring a laptop; we will pair designers with developers.',
        date: at(5, 14), venue: 'Design Studio, Block C', category: 'Workshop', price: 0,
        thumbnail: '/images/events/figma-ui-sprint.jpg', club: 'PixelPerfect Design Lab',
        college: 'National Institute of Design, Ahmedabad', creator: 'Priya Mehta',
    },
    {
        title: 'Intro to Rust',
        description: 'Ownership and borrowing without the tears. Two hours, live coding, no prior systems experience needed.',
        date: at(11, 17, 30), venue: 'Seminar Room 3', category: 'Workshop', price: 99,
        thumbnail: '/images/events/intro-to-rust.jpg', club: 'CodeCraft Society',
        college: 'Indian Institute of Technology, Mumbai', creator: 'Aditya Rao',
    },
    {
        title: 'Inter-College Football Finals',
        description: 'North Campus vs. the rest. Final of the winter league; bring your loudest friends.',
        date: at(6, 16), venue: 'University Stadium, North Campus', category: 'Sports', price: 0,
        thumbnail: '/images/events/football-finals.jpg', club: null,
        college: 'Delhi University — North Campus', creator: 'Rohan Gupta',
    },
    {
        title: 'T20 Night: Campus Cricket League',
        description: 'Floodlit T20 between hostel teams. Register as a team or come watch; the canteen stays open till the last over.',
        date: at(13, 18, 30), venue: 'Main Ground, Manipal', category: 'Sports', price: 50,
        thumbnail: null, club: null,
        college: 'Manipal Academy of Higher Education', creator: 'Meera Joshi',
    },
    {
        title: 'Unplugged: Acoustic Night',
        description: 'Guitars, a cajón and fairy lights. Open sign-up for three-song sets; bring a friend and a blanket.',
        date: at(3, 19), venue: 'Open Air Theatre', category: 'Cultural', price: 0,
        thumbnail: '/images/events/acoustic-night.jpg', club: 'Rhythm & Blues Dance Crew',
        college: 'Manipal Academy of Higher Education', creator: 'Lakshmi Pillai',
    },
    {
        title: 'Flavours of India Food Fest',
        description: 'Thirty stalls run by students from twenty states. Coupons at the gate; proceeds go to the campus scholarship fund.',
        date: at(19, 12), venue: 'Central Block Lawns', category: 'Cultural', price: 150,
        thumbnail: photo('1661534424056-6589e239546b'), club: null,
        college: 'Christ University, Bangalore', creator: 'Karthik Nair',
    },
    {
        title: 'Founder Fireside: Bootstrapping in College',
        description: 'Three alumni who built profitable companies from their hostel rooms, on what they would do differently. Q&A after.',
        date: at(8, 18), venue: 'Business School Auditorium', category: 'Business', price: 0,
        thumbnail: photo('1682962232755-f1d051ddb638'), club: 'Startup Incubator',
        college: 'Christ University, Bangalore', creator: 'Nikhil Menon',
    },
    {
        title: 'Street Photography Walk: Commercial Street',
        description: 'Two hours of street photography with feedback at the end. Phones welcome; it is about seeing, not gear.',
        date: at(15, 7), venue: 'Meet at Commercial Street Metro', category: 'Art', price: 0,
        thumbnail: photo('1517486808906-6ca8b3f04846'), club: 'Shutterbugs Photography',
        college: 'Christ University, Bangalore', creator: 'Nikhil Menon',
    },
    {
        title: 'Freshers Welcome Mixer',
        description: 'Meet every club in one evening. Stalls, games and a short set from the dance crew. First-years get in free.',
        date: at(2, 17), venue: 'Student Activity Centre', category: 'Social', price: 0,
        thumbnail: '/images/events/freshers-welcome-mixer.jpg', club: null,
        college: 'Symbiosis International, Pune', creator: 'Diya Kapoor',
    },
];

/** Who has registered for what. Titles from EVENTS and from seed-dummy. */
const GOING: Record<string, string[]> = {
    'Hack the Monsoon': ['Aditya Rao', 'Harsh Vardhan', 'Sameer Khan', 'Fatima Sheikh', 'Ishita Banerjee', 'Rahul Sharma', 'Sneha Patil'],
    'Build for Bharat: 36-hour Hackathon': ['Sameer Khan', 'Vikram Reddy', 'Lakshmi Pillai', 'Aditya Rao'],
    'CTF Night: Capture the Flag': ['Harsh Vardhan', 'Aditya Rao', 'Rahul Sharma'],
    'Figma to Production: UI Sprint': ['Ishita Banerjee', 'Diya Kapoor', 'Priya Mehta', 'Nikhil Menon'],
    'Inter-College Football Finals': ['Rohan Gupta', 'Zoya Mirza', 'Arjun Singh', 'Harsh Vardhan', 'Nikhil Menon'],
    'Unplugged: Acoustic Night': ['Lakshmi Pillai', 'Meera Joshi', 'Diya Kapoor'],
    'Flavours of India Food Fest': ['Nikhil Menon', 'Karthik Nair', 'Diya Kapoor', 'Zoya Mirza', 'Rohan Gupta', 'Ishita Banerjee'],
    'Founder Fireside: Bootstrapping in College': ['Karthik Nair', 'Nikhil Menon', 'Sameer Khan'],
    'Freshers Welcome Mixer': ['Diya Kapoor', 'Ananya Iyer', 'Zoya Mirza', 'Lakshmi Pillai', 'Rohan Gupta'],
    'HackOverflow 2026': ['Rahul Sharma', 'Aditya Rao', 'Harsh Vardhan', 'Sneha Patil', 'Vikram Reddy', 'Sameer Khan'],
    'Design Thinking Workshop': ['Priya Mehta', 'Ishita Banerjee'],
    'Inter-College Dance Battle': ['Meera Joshi', 'Lakshmi Pillai', 'Diya Kapoor', 'Ishita Banerjee'],
};

const TEAMS = [
    { event: 'Hack the Monsoon', by: 'Ishita Banerjee', type: 'LOOKING_FOR_TEAM' as const, skills: ['Figma', 'UI design', 'Prototyping'], description: 'Designer looking for a team that wants its demo to look good. Happy to do slides too.' },
    { event: 'Hack the Monsoon', by: 'Aditya Rao', type: 'LOOKING_FOR_MEMBER' as const, skills: ['React Native', 'Maps API'], description: 'We have backend and ML covered. Need someone who can build a mobile front end fast.' },
    { event: 'Build for Bharat: 36-hour Hackathon', by: 'Sameer Khan', type: 'LOOKING_FOR_MEMBER' as const, skills: ['Hindi or Tamil NLP', 'Python'], description: 'Building voice search for low-end phones. Looking for someone who has worked with Indic language models.' },
    { event: 'Build for Bharat: 36-hour Hackathon', by: 'Lakshmi Pillai', type: 'LOOKING_FOR_TEAM' as const, skills: ['Data analysis', 'Pitching'], description: 'Biotech student, good at research and presenting. Want to work on a health idea.' },
    { event: 'CTF Night: Capture the Flag', by: 'Harsh Vardhan', type: 'LOOKING_FOR_MEMBER' as const, skills: ['Web exploitation', 'Linux'], description: 'Two of us so far, both hardware people. Need someone comfortable with web challenges.' },
    { event: 'HackOverflow 2026', by: 'Fatima Sheikh', type: 'LOOKING_FOR_TEAM' as const, skills: ['Arduino', 'CAD', 'C++'], description: 'Hardware person who wants to join a team doing something physical. Have my own soldering kit.' },
];

async function main() {
    if (process.env.SEED_EXAMPLES !== '1') {
        console.error('Refusing to run: this writes example people and events into the database.');
        console.error('Set SEED_EXAMPLES=1 to confirm. Target: ' + (dbHost()));
        process.exit(1);
    }
    console.log('🌱 Seeding showcase data into ' + (dbHost()));

    const password = await bcrypt.hash(process.env.SEED_PASSWORD || randomBytes(24).toString('base64url'), 10);

    // ─── Colleges and existing people from seed-dummy ───
    const colleges = new Map((await prisma.college.findMany({ select: { id: true, name: true } })).map((c) => [c.name, c.id]));
    if (colleges.size === 0) throw new Error('No colleges found. Run prisma/seed-dummy.ts first.');

    // ─── Students ───
    for (const s of STUDENTS) {
        const exists = await prisma.user.findFirst({ where: { email: s.email } });
        if (!exists) {
            await prisma.user.create({
                data: {
                    name: s.name, email: s.email, password, role: 'USER', bio: s.bio,
                    department: s.department, year: s.year, collegeId: colleges.get(s.college) ?? null,
                },
            });
        }
    }
    const people = new Map((await prisma.user.findMany({ where: { deletedAt: null }, select: { id: true, name: true } })).map((u) => [u.name, u.id]));
    console.log(`✅ ${STUDENTS.length} extra students ready`);

    // ─── Club memberships ───
    const clubs = new Map((await prisma.club.findMany({ select: { id: true, name: true } })).map((c) => [c.name, c.id]));
    let joined = 0;
    for (const [club, names] of Object.entries(MEMBERSHIPS)) {
        const clubId = clubs.get(club);
        if (!clubId) continue;
        for (const name of names) {
            const userId = people.get(name);
            if (!userId) continue;
            const exists = await prisma.clubMember.findUnique({ where: { userId_clubId: { userId, clubId } } });
            if (!exists) {
                await prisma.clubMember.create({ data: { userId, clubId, role: 'MEMBER' } });
                joined++;
            }
        }
    }
    console.log(`✅ ${joined} new club memberships`);

    // ─── Events ───
    for (const e of EVENTS) {
        const hostCollegeId = colleges.get(e.college);
        if (!hostCollegeId) continue;
        const existing = await prisma.event.findFirst({ where: { title: e.title } });
        if (existing) {
            if (existing.date < new Date()) {
                await prisma.event.update({ where: { id: existing.id }, data: { date: e.date } });
            }
            continue;
        }
        await prisma.event.create({
            data: {
                title: e.title, description: e.description, date: e.date, venue: e.venue,
                category: e.category, price: e.price, thumbnail: e.thumbnail, verified: true,
                hostCollegeId, clubId: e.club ? clubs.get(e.club) ?? null : null,
                creatorId: people.get(e.creator) ?? null,
            },
        });
    }
    console.log(`✅ ${EVENTS.length} showcase events ready`);

    // ─── Registrations ───
    let registered = 0;
    for (const [title, names] of Object.entries(GOING)) {
        const event = await prisma.event.findFirst({ where: { title }, select: { id: true, price: true } });
        if (!event) continue;
        for (const name of names) {
            const userId = people.get(name);
            if (!userId) continue;
            const exists = await prisma.eventRegistration.findUnique({ where: { userId_eventId: { userId, eventId: event.id } } });
            if (exists) continue;
            await prisma.eventRegistration.create({
                data: {
                    userId, eventId: event.id,
                    // Paid examples are marked as such but carry no real
                    // payment: the id says so, and no money is recorded.
                    status: event.price > 0 ? 'PAID' : 'COMPLETED',
                    paymentId: event.price > 0 ? 'seed_example' : null,
                },
            });
            registered++;
        }
        const count = await prisma.eventRegistration.count({ where: { eventId: event.id } });
        await prisma.event.update({ where: { id: event.id }, data: { registrationCount: count } });
    }
    console.log(`✅ ${registered} new registrations`);

    // ─── Team finder ───
    let teams = 0;
    for (const t of TEAMS) {
        const event = await prisma.event.findFirst({ where: { title: t.event }, select: { id: true } });
        const creatorId = people.get(t.by);
        if (!event || !creatorId) continue;
        const exists = await prisma.teamRequest.findFirst({ where: { eventId: event.id, creatorId, description: t.description } });
        if (exists) continue;
        await prisma.teamRequest.create({
            data: {
                eventId: event.id, creatorId, creatorName: t.by, type: t.type,
                skills: JSON.stringify(t.skills), description: t.description,
            },
        });
        teams++;
    }
    console.log(`✅ ${teams} new team-finder posts`);

    console.log('\n🎉 Showcase data ready.');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
