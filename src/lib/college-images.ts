/**
 * Premium college image system for Campus Connect.
 *
 * Uses a named mapping for known colleges to guarantee
 * unique, visually appropriate images. Falls back to a
 * deterministic hash for user-added colleges.
 */

/** Curated Unsplash campus photography — 20 unique images */
const CAMPUS_IMAGES = [
    'https://images.unsplash.com/photo-1562774053-701939374585?w=800', // 0 Pillars (Apex)
    'https://images.unsplash.com/photo-1544531586-fde5298cdd40?w=800', // 1 Modern Facade (Christ)
    'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=800', // 2 Ivy Tower (Kgisl)
    'https://images.unsplash.com/photo-1492538368677-f6e0afe31dcc?w=800', // 3 Aerial Quad (Symbiosis)
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800', // 4 Main Building (BITS)
    'https://images.unsplash.com/photo-1574958269340-fa927503f3dd?w=800', // 5 Heritage Dome (IIT)
    'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=800', // 6 Clocktower (DU)
    'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=800', // 7 Autumn Path (VIT)
    'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800', // 8 Lawn
    'https://images.unsplash.com/photo-1580537659466-0a9bfa916a54?w=800', // 9 Modern Arch (Manipal)
    'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800', // 10 Library Exterior (NID)
    'https://images.unsplash.com/photo-1544531586-fde5298cdd40?w=800', // 11 Blue Hour
    'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800', // 12 Red Brick Arch
    'https://images.unsplash.com/photo-1568792923760-d70635a89fdc?w=800', // 13 Arched Hallway
    'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=800', // 14 Garden Fountain
    'https://images.unsplash.com/photo-1501290791933-f721f8933cc5?w=800', // 15 Glass Modern
    'https://images.unsplash.com/photo-1564981797816-1043664bf78d?w=800', // 16 Sunset Campus
    'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800', // 17 Old University
    'https://images.unsplash.com/photo-1541123437800-1bb1317badc2?w=800', // 18 Courtyard
    'https://images.unsplash.com/photo-1519452635265-7b1fbfd1e4e0?w=800', // 19 Campus Path
] as const;

/** Curated event photography based on category */
const EVENT_IMAGES = {
    'hackathon': 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800',
    'fest':      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800',
    'workshop':  'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800',
    'cultural':  'https://images.unsplash.com/photo-1460666819451-74129999a31d?w=800',
    'social':    'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&q=80&w=800',
    'mun':       'https://images.unsplash.com/photo-1475721027187-40aeae739572?auto=format&fit=crop&q=80&w=800', // Earth/Global
    'general':   'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=800',
} as const;

/** Curated club hero photography */
const CLUB_IMAGES = {
    'tech':     'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800',
    'coding':   'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800',
    'arts':     'https://images.unsplash.com/photo-1460666819451-74129999a31d?w=800',
    'music':    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800',
    'mun':      'https://images.unsplash.com/photo-1475721027187-40aeae739572?auto=format&fit=crop&q=80&w=800',
    'social':   'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&q=80&w=800',
    'business': 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&q=80&w=800',
    'sports':   'https://images.unsplash.com/photo-1461896704530-571f893118ac?auto=format&fit=crop&q=80&w=800',
    'general':  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=800',
} as const;


export interface PhotoCredit {
    author: string;
    license: string;
    /** The file's page on Wikimedia Commons, which carries the full licence. */
    source: string;
}

/**
 * Real photographs of the real campuses, stored under
 * public/images/colleges. Most are from Wikimedia Commons under a licence
 * that allows reuse with credit, so the credit travels with the photo and
 * is shown wherever the photo is. The ones without a credit were supplied
 * by the site owner. A generic stock building standing in for a named
 * college read as wrong to anyone from it.
 */
const CAMPUS_PHOTOS: { match: string[]; label: string; src: string; credit?: PhotoCredit }[] = [
    {
        match: ['indian institute of technology, mumbai', 'iit bombay', 'iit mumbai'],
        label: 'IIT Bombay',
        src: '/images/colleges/iit-bombay.jpg',
        credit: { author: 'Shishirdasika', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Main_building_in_IIT_Bombay.jpg' },
    },
    {
        match: ['national institute of design'],
        label: 'National Institute of Design, Ahmedabad',
        src: '/images/colleges/nid-ahmedabad.jpg',
    },
    {
        match: ['delhi university', 'university of delhi'],
        label: 'University of Delhi (Hindu College, North Campus)',
        src: '/images/colleges/delhi-university.jpg',
        credit: { author: 'Itsgaurav8', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Hindu_College,_University_of_Delhi.jpg' },
    },
    {
        match: ['bits pilani — goa', 'bits pilani - goa', 'bits goa', 'bits pilani'],
        label: 'BITS Pilani',
        src: '/images/colleges/bits-pilani.jpg',
    },
    {
        match: ['kgisl'],
        label: 'KGiSL Institute of Technology',
        src: '/images/colleges/kgisl.jpg',
    },
    {
        match: ['christ university'],
        label: 'Christ University, Bengaluru',
        src: '/images/colleges/christ-university.jpg',
        credit: { author: 'Rameshng', license: 'CC BY-SA 3.0', source: 'https://commons.wikimedia.org/wiki/File:Christ_University_Hosur_road_Bangalore_4819.JPG' },
    },
    {
        match: ['symbiosis'],
        label: 'Symbiosis International University, Pune',
        src: '/images/colleges/symbiosis-pune.jpg',
        credit: { author: 'DesiBoy101', license: 'CC BY 4.0', source: 'https://commons.wikimedia.org/wiki/File:Symbiosis_International_University,_S._B._Road_campus.jpg' },
    },
    {
        match: ['vit university', 'vellore institute of technology', 'vit vellore'],
        label: 'VIT Vellore',
        src: '/images/colleges/vit-vellore.jpg',
        credit: { author: 'Jishnu12684', license: 'CC BY 4.0', source: 'https://commons.wikimedia.org/wiki/File:Vellore_Institue_of_Technology.jpg' },
    },
    {
        match: ['manipal'],
        label: 'Manipal Institute of Technology',
        src: '/images/colleges/manipal.jpg',
        credit: { author: 'Ank Kumar', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Manipal_Institute_of_Technology_Academic_Building,_Manipal_University,_Manipal_Campus,_India_(Ank_Kumar,_Infosys_Limited_)_02.jpg' },
    },
];

function campusPhoto(collegeName: string) {
    const lower = collegeName.toLowerCase();
    return CAMPUS_PHOTOS.find((p) => p.match.some((m) => lower.includes(m)));
}

/** The credit for a college's photo, when it is one of the real campus photos. */
export function getCollegePhotoCredit(collegeName: string): PhotoCredit | null {
    return campusPhoto(collegeName)?.credit ?? null;
}

/** Every credited campus photo, for the credits page. */
export function allCampusPhotoCredits() {
    return CAMPUS_PHOTOS.flatMap((p) => (p.credit ? [{ college: p.label, src: p.src, ...p.credit }] : []));
}

/**
 * Stock stand-ins for colleges without a real photo yet.
 */
const COLLEGE_IMAGE_MAP: Record<string, string> = {
    'apex university':                          CAMPUS_IMAGES[0],  // pillars
};

/**
 * FNV-1a hash for deterministic fallback on unknown colleges.
 */
function stableHash(str: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

/**
 * Returns a curated campus image for the given college.
 * Uses named mapping for known colleges, FNV-1a hash fallback for others.
 */
export function getCollegeImage(collegeName: string, _collegeId?: string): string {
    const lower = collegeName.toLowerCase();

    const real = campusPhoto(collegeName);
    if (real) return real.src;

    // Check named mapping (substring match)
    for (const [key, url] of Object.entries(COLLEGE_IMAGE_MAP)) {
        if (lower.includes(key)) {
            return url;
        }
    }

    // Fallback: deterministic hash
    return CAMPUS_IMAGES[stableHash(lower) % CAMPUS_IMAGES.length];
}

/**
 * Primary API — always returns a premium campus photo.
 * Database logos are bypassed since they're unreliable.
 */
export function resolveCollegeImage(
    college?: { name: string; id?: string; logo?: string } | null
): string {
    if (!college) return CAMPUS_IMAGES[0];
    return getCollegeImage(college.name, college.id);
}

/**
 * Returns a high-quality event thumbnail based on category and title.
 */
/**
 * Photos for the example events (prisma/seed-showcase.ts), stored under
 * public/images/events and supplied by the site owner. Matched on the exact
 * title so they ship with the code: the database rows keep whatever
 * thumbnail they had, and nothing breaks on a deploy that does not have the
 * files yet. An event anyone else creates keeps its own picture.
 */
const EXAMPLE_EVENT_PHOTOS: Record<string, string> = {
    'freshers welcome mixer': '/images/events/freshers-welcome-mixer.jpg',
    'unplugged: acoustic night': '/images/events/acoustic-night.jpg',
    'ctf night: capture the flag': '/images/events/ctf-night.jpg',
    'figma to production: ui sprint': '/images/events/figma-ui-sprint.jpg',
    'inter-college football finals': '/images/events/football-finals.jpg',
    'intro to rust': '/images/events/intro-to-rust.jpg',
};

/** The local photo for one of the example events, or null. */
export function exampleEventPhoto(title?: string | null): string | null {
    return (title && EXAMPLE_EVENT_PHOTOS[title.trim().toLowerCase()]) || null;
}

/** The picture an event should show: its example photo, else its own thumbnail. */
export function eventPhoto(event: { title?: string | null; thumbnail?: string | null }): string | null {
    return exampleEventPhoto(event.title) ?? event.thumbnail ?? null;
}

export function resolveEventImage(
    category?: string | null, 
    thumbnail?: string | null,
    title?: string | null
): string {
    const example = exampleEventPhoto(title);
    if (example) return example;

    if (
        thumbnail &&
        !thumbnail.includes('placeholder') &&
        (thumbnail.startsWith('http') || thumbnail.startsWith('/'))
    ) {
        return thumbnail;
    }

    const cat = (category || 'general').toLowerCase();
    const name = (title || '').toLowerCase();
    
    // Title specific overrides (Priority 1)
    if (name.includes('mun') || name.includes('nations') || name.includes('diplomacy')) return EVENT_IMAGES.mun;

    // Category based (Priority 2)
    if (cat.includes('hack') || cat.includes('tech')) return EVENT_IMAGES.hackathon;
    if (cat.includes('fest') || cat.includes('concert')) return EVENT_IMAGES.fest;
    if (cat.includes('work') || cat.includes('learn')) return EVENT_IMAGES.workshop;
    if (cat.includes('cult') || cat.includes('art')) return EVENT_IMAGES.cultural;
    if (cat.includes('soc') || cat.includes('meet')) return EVENT_IMAGES.social;
    
    return EVENT_IMAGES.general;
}

/**
 * Returns a consistent logo for a club or college.
 */
export function resolveClubLogo(club?: { name: string; logo?: string | null } | null): string {
    if (club?.logo && club.logo.startsWith('http') && !club.logo.includes('placeholder')) {
        return club.logo;
    }
    
    // Use UI-Avatars for a foolproof logo fallback
    const name = encodeURIComponent(club?.name || 'Club');
    return `https://ui-avatars.com/api/?name=${name}&background=0F1F1C&color=EBF3F1&bold=true`;
}

/**
 * Returns a premium hero image for a club.
 */
export function resolveClubImage(club: { name: string; category?: string | null; logo?: string | null }): string {
    if (club.logo && !club.logo.includes('placeholder') && club.logo.startsWith('http')) {
        return club.logo;
    }

    const name = club.name.toLowerCase();
    const cat = (club.category || '').toLowerCase();

    if (name.includes('mun') || name.includes('nations') || name.includes('diplomacy')) return CLUB_IMAGES.mun;
    if (name.includes('code') || name.includes('dev') || name.includes('program')) return CLUB_IMAGES.coding;
    if (name.includes('tech') || name.includes('robo') || name.includes('science')) return CLUB_IMAGES.tech;
    if (name.includes('art') || name.includes('design') || name.includes('paint')) return CLUB_IMAGES.arts;
    if (name.includes('music') || name.includes('dance') || name.includes('sing')) return CLUB_IMAGES.music;
    if (name.includes('biz') || name.includes('ent') || name.includes('money')) return CLUB_IMAGES.business;
    if (name.includes('sport') || name.includes('play') || name.includes('fit')) return CLUB_IMAGES.sports;
    
    if (cat.includes('tech')) return CLUB_IMAGES.tech;
    if (cat.includes('art')) return CLUB_IMAGES.arts;
    if (cat.includes('soc')) return CLUB_IMAGES.social;
    
    return CLUB_IMAGES.general;
}
