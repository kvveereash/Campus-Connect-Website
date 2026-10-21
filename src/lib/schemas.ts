import { z } from 'zod';

/**
 * Input Validation Schemas
 * 
 * All schemas include:
 * - Minimum length requirements for meaningful data
 * - Maximum length limits to prevent abuse and database bloat
 * - Type-safe validation with Zod
 */

// --- Field Length Constants ---
const LIMITS = {
    TITLE_MIN: 3,
    TITLE_MAX: 200,
    DESCRIPTION_MIN: 10,
    DESCRIPTION_MAX: 5000,
    SHORT_TEXT_MAX: 300,
    CONTENT_MAX: 10000,
    URL_MAX: 2048,
    NAME_MIN: 2,
    NAME_MAX: 100,
} as const;

// --- Image URLs ---
/* Where a user-supplied picture may come from: a path on this site, our own
   Supabase Storage, or the two stock-image hosts the site already uses.
   z.string().url() accepted javascript: and data: URLs, and an avatar could
   point at any server, turning every profile view into a tracking pixel that
   handed visitors' IP addresses to whoever set it. */
const IMAGE_HOSTS = ['images.unsplash.com', 'ui-avatars.com'];

function storageHost(): string | null {
    try {
        return process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).hostname : null;
    } catch {
        return null;
    }
}

export function isAllowedImageUrl(value: string): boolean {
    if (value.startsWith('/')) return !value.startsWith('//') && !value.startsWith('/\\');
    try {
        const url = new URL(value);
        if (url.protocol !== 'https:') return false;
        if (IMAGE_HOSTS.includes(url.hostname)) return true;
        const own = storageHost();
        const isStorage = url.pathname.startsWith('/storage/v1/object/public/');
        return isStorage && (own ? url.hostname === own : url.hostname.endsWith('.supabase.co'));
    } catch {
        return false;
    }
}

const imageUrl = z.string().max(LIMITS.URL_MAX, 'Image URL too long').refine(isAllowedImageUrl, 'Use an uploaded image');

// --- Events ---
export const eventSchema = z.object({
    title: z.string()
        .min(LIMITS.TITLE_MIN, "Title must be at least 3 characters")
        .max(LIMITS.TITLE_MAX, "Title cannot exceed 200 characters"),
    description: z.string()
        .min(LIMITS.DESCRIPTION_MIN, "Description must be at least 10 characters")
        .max(LIMITS.DESCRIPTION_MAX, "Description cannot exceed 5000 characters"),
    date: z.string().refine((date) => new Date(date) > new Date(), {
        message: "Event date must be in the future",
    }),
    venue: z.string()
        .min(3, "Venue is required")
        .max(LIMITS.SHORT_TEXT_MAX, "Venue cannot exceed 300 characters"),
    category: z.string()
        .min(1, "Category is required")
        .max(50, "Category cannot exceed 50 characters"),
    thumbnail: imageUrl.optional(),
    price: z.number()
        .nonnegative("Price cannot be negative")
        .max(100000, "Price seems too high")
        .default(0),
    hostCollegeId: z.string().max(50).optional(),
    clubId: z.string().max(50).optional(),
    maxAttendees: z.number().int().positive().max(100000).optional(),
});

/* Not eventSchema.partial(). Under zod 4 .partial() keeps price's .default(0),
   so every edit that left price out quietly made a paid event free. The host
   club and college are not editable here either: moving an event to a club
   would need the same club-admin check that createEventAction does. Keys not
   listed are stripped. */
export const updateEventSchema = z.object({
    id: z.string().max(50),
    data: eventSchema
        .omit({ price: true, clubId: true, hostCollegeId: true })
        .partial()
        .extend({
            price: z.number()
                .nonnegative("Price cannot be negative")
                .max(100000, "Price seems too high")
                .optional(),
        }),
});

export const joinEventSchema = z.object({
    eventId: z.string().min(1).max(50)
});

// --- Clubs ---
export const clubSchema = z.object({
    name: z.string()
        .min(LIMITS.NAME_MIN, "Club name must be at least 2 characters")
        .max(LIMITS.NAME_MAX, "Club name cannot exceed 100 characters"),
    description: z.string()
        .min(LIMITS.DESCRIPTION_MIN, "Description must be at least 10 characters")
        .max(LIMITS.DESCRIPTION_MAX, "Description cannot exceed 5000 characters"),
    category: z.string()
        .min(1, "Category is required")
        .max(50, "Category cannot exceed 50 characters"),
    collegeId: z.string().max(50).optional(),
    newCollegeName: z.string()
        .min(3, "College name must be at least 3 characters")
        .max(LIMITS.NAME_MAX, "College name cannot exceed 100 characters")
        .optional(),
    logo: imageUrl.optional(),
}).refine((data) => data.collegeId || data.newCollegeName, {
    message: "You must select a college or enter a new one",
    path: ["collegeId"],
});

export const joinClubSchema = z.object({
    clubId: z.string().min(1, "Club ID is required").max(50),
});

export const leaveClubSchema = z.object({
    clubId: z.string().min(1, "Club ID is required").max(50),
});

export const deleteClubSchema = z.object({
    clubId: z.string().min(1, "Club ID is required").max(50),
});

export const clubPostSchema = z.object({
    clubId: z.string().min(1, "Club ID is required").max(50),
    content: z.string()
        .min(1, "Content is required")
        .max(LIMITS.CONTENT_MAX, "Content cannot exceed 10000 characters"),
    image: imageUrl.optional(),
});

// --- Team Requests ---
export const teamRequestSchema = z.object({
    eventId: z.string().min(1).max(50),
    description: z.string()
        .min(LIMITS.DESCRIPTION_MIN, "Description must be at least 10 characters")
        .max(LIMITS.DESCRIPTION_MAX, "Description cannot exceed 5000 characters"),
    skills: z.array(
        z.string().min(1).max(50, "Skill name too long")
    ).min(1, "At least one skill is required").max(20, "Too many skills"),
    type: z.enum(['LOOKING_FOR_TEAM', 'LOOKING_FOR_MEMBER']),
});

// --- Chat/Messages ---
export const messageSchema = z.object({
    content: z.string()
        .min(1, "Message cannot be empty")
        .max(2000, "Message cannot exceed 2000 characters"),
    conversationId: z.string().min(1).max(50),
    attachmentUrl: z.string().url().max(LIMITS.URL_MAX).optional(),
    attachmentType: z.enum(['image', 'file', 'link']).optional(),
});

// --- Reviews ---
export const reviewSchema = z.object({
    eventId: z.string().min(1).max(50),
    rating: z.number().int().min(1, "Rating must be at least 1").max(5, "Rating cannot exceed 5"),
    comment: z.string().max(1000, "Comment cannot exceed 1000 characters").optional(),
});

// --- User Profile ---
export const userProfileSchema = z.object({
    name: z.string()
        .min(LIMITS.NAME_MIN, "Name must be at least 2 characters")
        .max(LIMITS.NAME_MAX, "Name cannot exceed 100 characters")
        .optional(),
    bio: z.string().max(500, "Bio cannot exceed 500 characters").optional(),
    department: z.string().max(100).optional(),
    year: z.string().max(20).optional(),
    avatar: z.string().url().max(LIMITS.URL_MAX).optional(),
    resumeUrl: z.string().url().max(LIMITS.URL_MAX).optional(),
    skills: z.array(z.string().max(50)).max(50).optional(),
    interests: z.array(z.string().max(50)).max(50).optional(),
});

/* Links a profile renders as href. z.string().url() alone would accept
   javascript: URLs, so the scheme is pinned to http(s). */
const httpUrl = z.string()
    .max(LIMITS.URL_MAX)
    .refine((value) => /^https?:\/\//i.test(value), { message: "Must be an http(s) URL" });

/**
 * What a user may change about themselves through updateUserProfile.
 *
 * .strict() is the point: the action used to spread whatever the browser sent
 * into prisma.user.update, so a caller could set their own role to ADMIN, mark
 * their email verified, or write a raw password. Unknown keys are now an error.
 */
export const updateUserProfileSchema = z.object({
    name: z.string().trim()
        .min(LIMITS.NAME_MIN, "Name must be at least 2 characters")
        .max(LIMITS.NAME_MAX, "Name cannot exceed 100 characters")
        .optional(),
    bio: z.string().max(500, "Bio cannot exceed 500 characters").optional(),
    department: z.string().max(100).optional(),
    year: z.string().max(20).optional(),
    // Empty clears it; a leading slash is one of the site's own images.
    avatar: z.union([z.literal(''), imageUrl]).optional(),
    // The resume "upload" stores a file name for now, so this is plain text.
    resumeUrl: z.string().max(LIMITS.URL_MAX).optional(),
    skills: z.array(z.string().trim().min(1).max(50)).max(50).optional(),
    interests: z.array(z.string().trim().min(1).max(50)).max(50).optional(),
    achievements: z.array(z.object({
        id: z.string().max(50),
        title: z.string().max(LIMITS.TITLE_MAX),
        date: z.string().max(50),
        description: z.string().max(LIMITS.DESCRIPTION_MAX),
    })).max(50).optional(),
    projects: z.array(z.object({
        id: z.string().max(50),
        title: z.string().max(LIMITS.TITLE_MAX),
        description: z.string().max(LIMITS.DESCRIPTION_MAX),
        link: z.union([httpUrl, z.literal('')]).optional(),
        technologies: z.array(z.string().max(50)).max(30).optional(),
    })).max(50).optional(),
    portfolioLinks: z.array(z.object({
        id: z.string().max(50),
        platform: z.string().max(LIMITS.NAME_MAX),
        url: httpUrl,
    })).max(30).optional(),
    collegeId: z.string().max(50).optional(),
    customCollegeName: z.string().trim()
        .min(3, "College name must be at least 3 characters")
        .max(LIMITS.NAME_MAX, "College name cannot exceed 100 characters")
        .optional(),
}).strict();

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;

// --- Comments ---
export const commentSchema = z.object({
    postId: z.string().min(1).max(50),
    content: z.string()
        .min(1, "Comment cannot be empty")
        .max(2000, "Comment cannot exceed 2000 characters"),
});

// --- Colleges ---
export const updateCollegeSchema = z.object({
    collegeId: z.string().min(1),
    name: z.string().max(LIMITS.NAME_MAX, "Name cannot exceed 100 characters").optional(),
    description: z.string().max(LIMITS.DESCRIPTION_MAX, "Description cannot exceed 5000 characters").optional(),
    logo: imageUrl.optional(),
    location: z.string().max(LIMITS.SHORT_TEXT_MAX, "Location cannot exceed 300 characters").optional(),
});

// Export limits for use in UI validation
export { LIMITS };
