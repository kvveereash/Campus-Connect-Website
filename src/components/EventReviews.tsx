'use client';

import { useCallback, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { addEventReview, getEventReviews, getUserEventReview, deleteEventReview } from '@/lib/actions/reviews';
import { toast } from 'sonner';
import Image from 'next/image';
import styles from './EventReviews.module.css';
import { formatIST } from '@/lib/format';

interface Review {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
    user: {
        id: string;
        name: string;
        avatar: string | null;
    };
}

/* Defined at module level. Declared inside EventReviews it was a new
   component on every render, so its buttons were thrown away and rebuilt on
   each click, and keyboard focus was lost after choosing a rating. */
const StarRating = ({
    value,
    onChange,
    readonly = false,
    large = false,
}: {
    value: number;
    onChange?: (v: number) => void;
    readonly?: boolean;
    large?: boolean;
}) => (
    <div
        className={`${styles.stars} ${large ? styles.starsLarge : ''}`}
        role={readonly ? 'img' : undefined}
        aria-label={readonly ? `${value} out of 5` : undefined}
    >
        {[1, 2, 3, 4, 5].map((star) => (
            <button
                key={star}
                type="button"
                onClick={() => !readonly && onChange?.(star)}
                disabled={readonly}
                aria-label={readonly ? undefined : `${star} star${star > 1 ? 's' : ''}`}
                className={`${styles.star} ${star <= value ? styles.starOn : ''}`}
            >
                ★
            </button>
        ))}
    </div>
);

export default function EventReviews({ eventId, isPastEvent }: { eventId: string; isPastEvent: boolean }) {
    const { user } = useAuth();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [avgRating, setAvgRating] = useState(0);
    const [totalReviews, setTotalReviews] = useState(0);
    const [userReview, setUserReview] = useState<Review | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Check if user attended the event
    const hasAttended = user?.registrations?.some(
        r => r.eventId === eventId && (r.status === 'PAID' || r.status === 'COMPLETED')
    );


    const userId = user?.id;

    /** The event's reviews, and yours if you are signed in. */
    const fetchReviews = (signedIn: boolean) =>
        Promise.all([getEventReviews(eventId), signedIn ? getUserEventReview(eventId) : Promise.resolve(null)]);

    // Only calls state setters, which never change, so it is made once.
    const applyReviews = useCallback(([result, mine]: Awaited<ReturnType<typeof fetchReviews>>) => {
        if (result.success) {
            setReviews(result.reviews as Review[]);
            setAvgRating(result.averageRating);
            setTotalReviews(result.totalReviews);
        }
        if (mine?.review) {
            setUserReview(mine.review as Review);
            setRating(mine.review.rating);
            setComment(mine.review.comment || '');
        }
        setIsLoading(false);
    }, []);

    const loadReviews = async () => applyReviews(await fetchReviews(Boolean(userId)));

    // Re-run once the session arrives: on a fresh load `user` is still null on
    // the first pass, so someone who had already reviewed saw an empty form.
    useEffect(() => {
        let alive = true;
        Promise.all([getEventReviews(eventId), userId ? getUserEventReview(eventId) : Promise.resolve(null)]).then(
            (data) => {
                if (alive) applyReviews(data);
            }
        );
        return () => {
            alive = false;
        };
    }, [eventId, userId, applyReviews]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const result = await addEventReview(eventId, rating, comment);

        if (result.success) {
            toast.success(userReview ? 'Review updated!' : 'Review added!');
            setShowForm(false);
            loadReviews();
        } else {
            toast.error(result.error || 'Failed to submit review');
        }
        setSubmitting(false);
    };

    // Arms in place instead of opening window.confirm(), which the page
    // cannot style and which reads as a browser error rather than a choice.
    const [armedReview, setArmedReview] = useState<string | null>(null);

    const handleDelete = async (reviewId: string) => {
        setArmedReview(null);
        const result = await deleteEventReview(reviewId);
        if (result.success) {
            toast.success('Review deleted');
            setUserReview(null);
            loadReviews();
        } else {
            toast.error(result.error || 'Failed to delete');
        }
    };

    if (!isPastEvent) {
        // Future events keep the heading, so the page does not simply stop at
        // the teammate list -- it says the section exists and when it opens.
        return (
            <div className={styles.section}>
                <div className={styles.head}>
                    <h2 className={styles.title}>Reviews</h2>
                </div>
                <p className={styles.note}>Reviews open once the event has ended.</p>
            </div>
        );
    }

    return (
        <div className={styles.section}>
            <div className={styles.head}>
                <div>
                    <h2 className={styles.title}>Reviews</h2>
                    {totalReviews > 0 && (
                        <div className={styles.summary}>
                            <StarRating value={Math.round(avgRating)} readonly />
                            <span className={styles.summaryText}>
                                {avgRating.toFixed(1)} from {totalReviews}{' '}
                                {totalReviews === 1 ? 'review' : 'reviews'}
                            </span>
                        </div>
                    )}
                </div>

                {hasAttended && !showForm && (
                    <button
                        type="button"
                        onClick={() => setShowForm(true)}
                        className="btn btn-outline"
                    >
                        {userReview ? 'Edit your review' : 'Write a review'}
                    </button>
                )}
            </div>

            {showForm && hasAttended && (
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.field}>
                        <label className={styles.label}>Your rating</label>
                        <StarRating value={rating} onChange={setRating} large />
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="review-comment">
                            In your words (optional)
                        </label>
                        <textarea
                            id="review-comment"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="What was it actually like?"
                            className={styles.textarea}
                        />
                    </div>

                    <div className={styles.formActions}>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? 'Saving' : userReview ? 'Update review' : 'Post review'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => setShowForm(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {isLoading ? (
                <p className={styles.empty}>Loading</p>
            ) : reviews.length === 0 ? (
                <p className={styles.empty}>
                    No reviews yet.{' '}
                    {hasAttended
                        ? 'You were there — say how it went.'
                        : 'Only people who registered can review this one.'}
                </p>
            ) : (
                <div className={styles.list}>
                    {reviews.map((review) => (
                        <article key={review.id} className={styles.review}>
                            <span className={styles.avatar} aria-hidden="true">
                                {review.user.avatar ? (
                                    <Image src={review.user.avatar} alt="" fill sizes="40px" />
                                ) : (
                                    review.user.name.charAt(0).toUpperCase()
                                )}
                            </span>

                            <div>
                                <p className={styles.name}>{review.user.name}</p>
                                <StarRating value={review.rating} readonly />
                                {review.comment && (
                                    <p className={styles.comment}>{review.comment}</p>
                                )}
                                <p className={styles.stamp}>
                                    {formatIST(review.createdAt, {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                    })}
                                </p>
                            </div>

                            {user?.id === review.user.id && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        armedReview === review.id
                                            ? handleDelete(review.id)
                                            : setArmedReview(review.id)
                                    }
                                    onBlur={() => setArmedReview(null)}
                                    className={styles.remove}
                                >
                                    {armedReview === review.id ? 'Confirm' : 'Delete'}
                                </button>
                            )}
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}
