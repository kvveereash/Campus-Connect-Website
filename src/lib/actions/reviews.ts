'use server';

import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

/**
 * Add or update a review for an event
 * User must have attended the event (PAID/COMPLETED registration)
 */
export async function addEventReview(
    eventId: string,
    rating: number,
    comment?: string
) {
    const session = await getSession();
    if (!session || !session.userId) {
        return { success: false, error: 'Unauthorized' };
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
        return { success: false, error: 'Rating must be between 1 and 5' };
    }

    try {
        // Check if user attended this event
        const registration = await prisma.eventRegistration.findFirst({
            where: {
                userId: session.userId as string,
                eventId,
                status: { in: ['PAID', 'COMPLETED'] }
            }
        });

        if (!registration) {
            return { success: false, error: 'You must attend the event to leave a review' };
        }

        // Check if event has already happened
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            select: { date: true }
        });

        if (!event) {
            return { success: false, error: 'Event not found' };
        }

        if (new Date(event.date) > new Date()) {
            return { success: false, error: 'You can only review past events' };
        }

        // Create or update review
        const review = await prisma.eventReview.upsert({
            where: {
                userId_eventId: {
                    userId: session.userId as string,
                    eventId
                }
            },
            update: {
                rating,
                comment: comment || null
            },
            create: {
                userId: session.userId as string,
                eventId,
                rating,
                comment: comment || null
            }
        });

        revalidatePath(`/events/${eventId}`);

        return { success: true, review };
    } catch (error) {
        console.error('Failed to add review:', error);
        return { success: false, error: 'Failed to add review' };
    }
}

/**
 * Get all reviews for an event
 */
export async function getEventReviews(eventId: string) {
    try {
        const reviews = await prisma.eventReview.findMany({
            where: { eventId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Calculate average rating
        const avgRating = reviews.length > 0
            ? reviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / reviews.length
            : 0;

        return {
            success: true,
            reviews,
            averageRating: Math.round(avgRating * 10) / 10,
            totalReviews: reviews.length
        };
    } catch (error) {
        console.error('Failed to get reviews:', error);
        return { success: false, reviews: [], averageRating: 0, totalReviews: 0 };
    }
}

/**
 * Delete a review (only author can delete)
 */
export async function deleteEventReview(reviewId: string) {
    const session = await getSession();
    if (!session || !session.userId) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const review = await prisma.eventReview.findUnique({
            where: { id: reviewId }
        });

        if (!review) {
            return { success: false, error: 'Review not found' };
        }

        if (review.userId !== session.userId) {
            return { success: false, error: 'Not authorized to delete this review' };
        }

        await prisma.eventReview.delete({
            where: { id: reviewId }
        });

        revalidatePath(`/events/${review.eventId}`);

        return { success: true };
    } catch (error) {
        console.error('Failed to delete review:', error);
        return { success: false, error: 'Failed to delete review' };
    }
}

/**
 * Get user's review for an event (if exists)
 */
export async function getUserEventReview(eventId: string) {
    const session = await getSession();
    if (!session || !session.userId) {
        return { success: false, review: null };
    }

    try {
        const review = await prisma.eventReview.findUnique({
            where: {
                userId_eventId: {
                    userId: session.userId as string,
                    eventId
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true
                    }
                }
            }
        });

        return { success: true, review };
    } catch (error) {
        return { success: false, review: null };
    }
}
