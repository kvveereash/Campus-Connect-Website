/**
 * Where each college is, for the Venues map. Colleges have no coordinates in
 * the database, so they live here, matched on the name like the photos in
 * college-images.ts. Campus-level and approximate: a pin per college, not a
 * room. A college missing from this list simply has no pin; add it here.
 */

type Coords = [lat: number, lng: number];

const COORDS: { match: string[]; at: Coords }[] = [
    { match: ['indian institute of technology mumbai', 'iit bombay', 'iit mumbai'], at: [19.1334, 72.9133] },
    { match: ['bits pilani goa', 'bits goa'], at: [15.3911, 73.8782] },
    { match: ['christ university'], at: [12.9343, 77.606] },
    { match: ['delhi university north campus', 'university of delhi north campus'], at: [28.688, 77.21] },
    { match: ['manipal academy of higher education', 'manipal'], at: [13.3525, 74.7928] },
    { match: ['national institute of design'], at: [23.0119, 72.567] },
    { match: ['symbiosis international'], at: [18.537, 73.728] },
    { match: ['vit university vellore', 'vit vellore'], at: [12.9692, 79.1559] },
    { match: ['kgisl'], at: [11.082, 76.997] },
];

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** The college's coordinates, or null when it is not on the list. */
export function collegeCoords(name?: string | null): Coords | null {
    if (!name) return null;
    const n = normalise(name);
    return COORDS.find((c) => c.match.some((m) => n.includes(m)))?.at ?? null;
}
