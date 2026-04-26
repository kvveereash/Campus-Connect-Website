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
    'social':    'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800',
    'mun':       'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=800', // Diplomacy
    'general':   'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800',
} as const;

/** Curated club hero photography */
const CLUB_IMAGES = {
    'tech':     'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800',
    'coding':   'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800',
    'arts':     'https://images.unsplash.com/photo-1460666819451-74129999a31d?w=800',
    'music':    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800',
    'mun':      'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=800', // Diplomacy
    'social':   'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800',
    'business': 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=800',
    'sports':   'https://images.unsplash.com/photo-1461896704530-571f893118ac?w=800',
    'general':  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800',
} as const;

/** Clean placeholders for clubs/logos */
const LOGO_PLACEHOLDERS = [
    'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100', // Minimal Business
    'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=100', // Abstract Tech
    'https://images.unsplash.com/photo-1557683316-973673baf926?w=100', // Blue Gradient
] as const;


/**
 * Named mapping for seeded/known colleges.
 */
const COLLEGE_IMAGE_MAP: Record<string, string> = {
    'apex university':                          CAMPUS_IMAGES[0],  // pillars
    'bits pilani':                              CAMPUS_IMAGES[4],  // main building
    'christ university':                        CAMPUS_IMAGES[1],  // modern facade
    'delhi university':                         CAMPUS_IMAGES[6],  // clocktower
    'indian institute of technology':           CAMPUS_IMAGES[5],  // heritage dome
    'iit ':                                     CAMPUS_IMAGES[5],  // heritage dome
    'kgisl':                                    CAMPUS_IMAGES[2],  // ivy tower
    'manipal academy':                          CAMPUS_IMAGES[9],  // modern arch
    'national institute of design':             CAMPUS_IMAGES[10], // library exterior
    'symbiosis international':                  CAMPUS_IMAGES[3],  // aerial quad
    'vit university':                           CAMPUS_IMAGES[7],  // autumn path
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
export function resolveEventImage(
    category?: string | null, 
    thumbnail?: string | null,
    title?: string | null
): string {
    if (thumbnail && !thumbnail.includes('placeholder') && thumbnail.startsWith('http')) {
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
export function resolveClubLogo(club?: { name: string; logo?: string } | null): string {
    if (club?.logo && club.logo.startsWith('http')) return club.logo;
    
    // Fallback to a deterministic abstract logo
    const name = club?.name || 'Unknown';
    return LOGO_PLACEHOLDERS[stableHash(name) % LOGO_PLACEHOLDERS.length];
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
