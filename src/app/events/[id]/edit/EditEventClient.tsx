'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import styles from './page.module.css';
import { EventDetail } from '@/lib/actions/events';
import { updateEvent } from '@/lib/actions/events';

// The same categories the create form offers. This list had drifted (Fest,
// Seminar, Tech Talk), so editing an event could not keep its own category.
const CATEGORIES = ['Technology', 'Hackathon', 'Workshop', 'Cultural', 'Social', 'Art', 'Sports', 'Business'];

/* A datetime-local input shows and returns the browser's local time. This was
   filled with toISOString() (UTC), then read back as local time on submit, so
   every save moved the event by the viewer's UTC offset (5h30m earlier in
   India) and, because the date "changed", sent it back for re-approval. */
function toLocalInputValue(date: Date | string) {
    const d = new Date(date);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function EditEventClient({ event }: { event: EventDetail }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const categories = CATEGORIES.includes(event.category) ? CATEGORIES : [event.category, ...CATEGORIES];

    const [formData, setFormData] = useState({
        title: event.title,
        description: event.description,
        date: toLocalInputValue(event.date),
        venue: event.venue,
        category: event.category,
        thumbnail: event.thumbnail || '',
        capacity: event.capacity === null ? '' : String(event.capacity),
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const result = await updateEvent(event.id, {
                ...formData,
                thumbnail: formData.thumbnail.trim() || undefined,
                // More seats fill from the waitlist straight away (server side).
                capacity: formData.capacity.trim() ? Number(formData.capacity) : null,
                // Parsed as local time, which is what the input showed.
                date: new Date(formData.date),
            });

            // updateEvent reports failure in its result rather than throwing,
            // and this used to navigate away as if every save had worked.
            if (!result.success) {
                toast.error(result.error || 'Could not save the event');
                return;
            }

            toast.success('Event updated');
            router.push(`/events/${event.id}`);
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error('Could not save the event');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Edit Event</h1>
            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="title">Event Title</label>
                    <input
                        type="text"
                        id="title"
                        name="title"
                        required
                        className={styles.input}
                        value={formData.title}
                        onChange={handleChange}
                    />
                </div>

                {/* Read-only: the host cannot be changed after creation (the
                    server ignores it). This was a select of three made-up
                    colleges that showed the wrong one for most events. */}
                <div className={styles.formGroup}>
                    <span className={styles.label}>Hosted by</span>
                    <p>{event.club?.name ?? event.hostCollege.name}</p>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="category">Category</label>
                    <select
                        id="category"
                        name="category"
                        className={styles.select}
                        value={formData.category}
                        onChange={handleChange}
                    >
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="date">Date & Time</label>
                    <input
                        type="datetime-local"
                        id="date"
                        name="date"
                        required
                        className={styles.input}
                        value={formData.date}
                        onChange={handleChange}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="venue">Venue</label>
                    <input
                        type="text"
                        id="venue"
                        name="venue"
                        required
                        className={styles.input}
                        value={formData.venue}
                        onChange={handleChange}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="capacity">Seats</label>
                    <input
                        type="number"
                        id="capacity"
                        name="capacity"
                        min="1"
                        step="1"
                        inputMode="numeric"
                        className={styles.input}
                        value={formData.capacity}
                        onChange={handleChange}
                        placeholder="No limit"
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="description">Description</label>
                    <textarea
                        id="description"
                        name="description"
                        required
                        className={styles.textarea}
                        value={formData.description}
                        onChange={handleChange}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="thumbnail">Thumbnail URL</label>
                    {/* text, not url: stored thumbnails are often site paths
                        (/event-placeholder.png), which type="url" rejects, so
                        most events could not be saved at all. */}
                    <input
                        type="text"
                        id="thumbnail"
                        name="thumbnail"
                        placeholder="https://example.com/image.jpg"
                        className={styles.input}
                        value={formData.thumbnail}
                        onChange={handleChange}
                    />
                    {formData.thumbnail && (
                        <div style={{ marginTop: '0.5rem', borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                            <img
                                src={formData.thumbnail}
                                alt="Preview"
                                style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button type="button" onClick={() => router.back()} className="btn btn-outline" style={{ flex: 1 }}>
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isLoading}>
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
}
