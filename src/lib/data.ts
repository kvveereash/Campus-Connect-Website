import { College, Event, User } from '@/types';

export const COLLEGES: College[] = [
    {
        id: 'c1',
        name: 'IIT Bombay',
        location: 'Mumbai, Maharashtra',
        logo: '/iitb.png',
        description: 'Premier engineering institute known for Techfest and Mood Indigo.',
    },
    {
        id: 'c2',
        name: 'BITS Pilani',
        location: 'Pilani, Rajasthan',
        logo: '/bits.png',
        description: 'Renowned for its innovation and Oasis cultural fest.',
    },
    {
        id: 'c3',
        name: 'NIT Trichy',
        location: 'Tiruchirappalli, Tamil Nadu',
        logo: '/nitt.png',
        description: 'Top NIT with a vibrant technical and cultural scene.',
    },
];

export const EVENTS: Event[] = [
    {
        id: 'e1',
        title: 'Techfest 2025',
        description: 'Asia’s largest science and technology festival.',
        date: '2025-12-15T09:00:00Z',
        venue: 'Convocation Hall',
        hostCollegeId: 'c1',
        category: 'Fest',
        registrationCount: 1200,
        price: 499,
        thumbnail: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1000',
    },
    {
        id: 'e2',
        title: 'HackTheFuture',
        description: '24-hour hackathon solving real-world problems.',
        date: '2025-12-20T10:00:00Z',
        venue: 'Main Auditorium',
        hostCollegeId: 'c2',
        category: 'Hackathon',
        registrationCount: 450,
        price: 0,
        thumbnail: '/hackathon_coding_1766237719122.png',
    },
    {
        id: 'e3',
        title: 'AI Workshop',
        description: 'Hands-on workshop on Generative AI.',
        date: '2025-12-18T14:00:00Z',
        venue: 'CS Department',
        hostCollegeId: 'c3',
        category: 'Workshop',
        registrationCount: 80,
        price: 999,
        thumbnail: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1000',
    },
];

export const MOCK_USER: User = {
    id: 'u1',
    name: 'Veereash',
    email: 'veereash@student.college.edu',
    collegeId: 'c1',
    department: 'Computer Science',
    year: '3rd Year',
    followedColleges: ['c2'],
    registrations: [], // Clean start for testings: 
    badges: [
        {
            id: 'b1',
            name: 'Hackathon Winner',
            description: 'Won 1st place in a district hackathon',
            icon: '🏆',
            dateEarned: '2025-11-15'
        },
        {
            id: 'b2',
            name: 'Social Butterfly',
            description: 'Attended 5+ networking events',
            icon: '🦋',
            dateEarned: '2025-10-20'
        },
        {
            id: 'b3',
            name: 'Code Ninja',
            description: 'Solved 100+ problems',
            icon: '🥷',
            dateEarned: '2025-12-01'
        }
    ]
};
