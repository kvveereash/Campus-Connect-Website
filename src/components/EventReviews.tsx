'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { addEventReview, getEventReviews, getUserEventReview, deleteEventReview } from '@/lib/actions/reviews';
import { toast } from 'sonner';
import Image from 'next/image';

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

    useEffect(() => {
        loadReviews();
    }, [eventId]);

    const loadReviews = async () => {
        setIsLoading(true);
        const result = await getEventReviews(eventId);
        if (result.success) {
            setReviews(result.reviews as Review[]);
            setAvgRating(result.averageRating);
            setTotalReviews(result.totalReviews);
        }

        // Check user's existing review
        if (user) {
            const userResult = await getUserEventReview(eventId);
            if (userResult.review) {
                setUserReview(userResult.review as Review);
                setRating(userResult.review.rating);
                setComment(userResult.review.comment || '');
            }
        }
        setIsLoading(false);
    };

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

    const handleDelete = async (reviewId: string) => {
        if (!confirm('Delete your review?')) return;

        const result = await deleteEventReview(reviewId);
        if (result.success) {
            toast.success('Review deleted');
            setUserReview(null);
            loadReviews();
        } else {
            toast.error(result.error || 'Failed to delete');
        }
    };

    const StarRating = ({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) => (
        <div style={{ display: 'flex', gap: '0.25rem' }}>
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    onClick={() => !readonly && onChange?.(star)}
                    disabled={readonly}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: readonly ? 'default' : 'pointer',
                        fontSize: '1.5rem',
                        color: star <= value ? '#fbbf24' : '#d1d5db',
                        transition: 'transform 0.1s',
                    }}
                    onMouseEnter={(e) => !readonly && (e.currentTarget.style.transform = 'scale(1.2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                    ★
                </button>
            ))}
        </div>
    );

    if (!isPastEvent) {
        // For future events, show a message instead of hiding completely
        return (
            <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--surface-color)', borderRadius: '1rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    Reviews & Ratings
                </h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                    ⏳ Reviews will be available after the event ends.
                </p>
            </div>
        );
    }

    return (
        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--surface-color)', borderRadius: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                        Reviews & Ratings
                    </h3>
                    {totalReviews > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                            <StarRating value={Math.round(avgRating)} readonly />
                            <span>{avgRating.toFixed(1)} ({totalReviews} reviews)</span>
                        </div>
                    )}
                </div>

                {hasAttended && !showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="btn btn-primary"
                        style={{ padding: '0.5rem 1rem' }}
                    >
                        {userReview ? '✏️ Edit Review' : '⭐ Write Review'}
                    </button>
                )}
            </div>

            {/* Review Form */}
            {showForm && hasAttended && (
                <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--background-color)', borderRadius: '0.75rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Your Rating</label>
                        <StarRating value={rating} onChange={setRating} />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Review (optional)</label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Share your experience..."
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                border: '1px solid var(--border-color)',
                                minHeight: '80px',
                                resize: 'vertical'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? 'Submitting...' : 'Submit Review'}
                        </button>
                        <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* Reviews List */}
            {isLoading ? (
                <p style={{ color: 'var(--text-secondary)' }}>Loading reviews...</p>
            ) : reviews.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                    No reviews yet. {hasAttended ? 'Be the first to review!' : 'Attend the event to leave a review.'}
                </p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {reviews.map((review) => (
                        <div key={review.id} style={{ padding: '1rem', background: 'var(--background-color)', borderRadius: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                    {review.user.avatar ? (
                                        <Image
                                            src={review.user.avatar}
                                            alt=""
                                            width={40}
                                            height={40}
                                            style={{ borderRadius: '50%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: '50%',
                                            background: 'var(--primary-color)',
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 600
                                        }}>
                                            {review.user.name.charAt(0)}
                                        </div>
                                    )}
                                    <div>
                                        <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{review.user.name}</p>
                                        <StarRating value={review.rating} readonly />
                                    </div>
                                </div>

                                {user?.id === review.user.id && (
                                    <button
                                        onClick={() => handleDelete(review.id)}
                                        style={{ background: 'none', border: 'none', color: 'var(--error-color)', cursor: 'pointer' }}
                                    >
                                        🗑️
                                    </button>
                                )}
                            </div>

                            {review.comment && (
                                <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)' }}>
                                    {review.comment}
                                </p>
                            )}

                            <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {new Date(review.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
