'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';
import { EventWithRelations } from '@/lib/actions/events';
import { updateEvent } from '@/lib/actions/events'; // We'll need to create/ensure this action exists

const CATEGORIES = ['Hackathon', 'Fest', 'Workshop', 'Seminar', 'Tech Talk'];
const COLLEGES = [
    { id: 'c1', name: 'IIT Bombay' },
    { id: 'c2', name: 'BITS Pilani' },
    { id: 'c3', name: 'NIT Trichy' }
    // Ideally fetch this dynamically too, but hardcoded list matches seed for now
];

export default function EditEventClient({ event }: { event: EventWithRelations }) {
    const router = useRouter();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        title: event.title,
        description: event.description,
        date: new Date(event.date).toISOString().slice(0, 16),
        venue: event.venue,
        hostCollegeId: event.hostCollegeId,
        category: event.category,
        thumbnail: event.thumbnail || '/event-thumb-hackathon.png',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Call server action directly
            await updateEvent(event.id, {
                ...formData,
                date: new Date(formData.date) as any
            });

            router.push(`/events/${event.id}`);
            router.refresh();
        } catch (error) {
            alert('Failed to update event');
            console.error(error);
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

                {/* Only show college select if not a club event */}
                {!event.clubId && (
                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="college">Hosting College</label>
                        <select
                            id="college"
                            name="hostCollegeId"
                            className={styles.select}
                            value={formData.hostCollegeId}
                            onChange={handleChange}
                        >
                            {COLLEGES.map(college => (
                                <option key={college.id} value={college.id}>
                                    {college.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="category">Category</label>
                    <select
                        id="category"
                        name="category"
                        className={styles.select}
                        value={formData.category}
                        onChange={handleChange}
                    >
                        {CATEGORIES.map(cat => (
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
                    <input
                        type="url"
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
