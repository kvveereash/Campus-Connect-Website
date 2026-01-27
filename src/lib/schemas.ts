import { z } from 'zod';

// --- Events ---
export const eventSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters").max(100),
    description: z.string().min(10, "Description must be at least 10 characters"),
    date: z.string().refine((date) => new Date(date) > new Date(), {
        message: "Event date must be in the future",
    }),
    venue: z.string().min(3, "Venue is required"),
    category: z.string().min(1, "Category is required"),
    thumbnail: z.string().optional(),
    price: z.number().nonnegative("Price cannot be negative").default(0),
    hostCollegeId: z.string().optional(),
    clubId: z.string().optional(),
    // Optional fields for updates or specific flows
    maxAttendees: z.number().int().positive().optional(),
});

export const updateEventSchema = z.object({
    id: z.string(),
    data: eventSchema.partial()
});

export const joinEventSchema = z.object({
    eventId: z.string()
});

// --- Clubs ---
export const clubSchema = z.object({
    name: z.string().min(3, "Club name must be at least 3 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    category: z.string().min(1, "Category is required"),
    collegeId: z.string().min(1, "College selection is required").optional(),
    logo: z.string().url("Invalid Logo URL").optional().or(z.literal('/club-logo-placeholder.png')),
});

// --- Team Requests ---
export const teamRequestSchema = z.object({
    eventId: z.string(),
    description: z.string().min(10, "Description must be at least 10 characters"),
    skills: z.array(z.string()).min(1, "At least one skill is required"),
    type: z.enum(['LOOKING_FOR_TEAM', 'LOOKING_FOR_MEMBER']),
});
