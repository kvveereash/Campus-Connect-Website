'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { createEvent } from '@/lib/actions';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';
import ImageUpload from '@/components/ImageUpload';
import { COLLEGES } from '@/lib/data';

const CATEGORIES = ['Hackathon', 'Fest', 'Workshop', 'Cultural', 'Tech Talk', 'Seminar'];

export default function CreateEventPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    // Filter clubs where user is admin
    const adminClubs = user?.clubMemberships?.filter(m => m.role === 'ADMIN').map(m => m.club) || [];

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: '',
        venue: '',
        hostCollegeId: user?.collegeId || COLLEGES[0].id,
        category: CATEGORIES[0],
        thumbnail: '/event-placeholder.png',
        clubId: adminClubs.length > 0 ? adminClubs[0]?.id || '' : '',
        price: 0,
    });

    useEffect(() => {
        if (adminClubs.length > 0 && !formData.clubId) {
            setFormData(prev => ({ ...prev, clubId: adminClubs[0]?.id || '' }));
        }
    }, [user, adminClubs, formData.clubId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (url: string) => {
        setFormData(prev => ({ ...prev, thumbnail: url }));
    };

    if (!user) return null;

    // Access Denied Check
    if (adminClubs.length === 0) {
        return (
            <div className={styles.container}>
                <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <h1 className={styles.title}>Host an Event</h1>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '16px', border: '1px dashed var(--secondary-color)', maxWidth: '600px', margin: '2rem auto' }}>
                        <p style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: '#e2e8f0' }}>
                            🚫 You need to be a <strong>Club Admin</strong> to host events.
                        </p>
                        <p style={{ marginBottom: '2rem', color: '#94a3b8' }}>
                            Events on Campus Connect must be hosted by an official club or organization to ensure credibility.
                        </p>
                        <button
                            onClick={() => router.push('/clubs')}
                            className="btn btn-primary"
                            style={{ background: 'var(--primary-color)', padding: '0.75rem 2rem', borderRadius: '8px', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                        >
                            Create or Join a Club
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const submissionData = {
                ...formData,
                date: new Date(formData.date).toISOString(),
                clubId: formData.clubId, // Always use the clubId from form
                price: Number(formData.price) || 0,
            };

            const result = await createEvent(submissionData);
            if (result.success) {
                toast.success('Event created successfully!');
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for revalidate
                router.push('/events');
            } else {
                toast.error(result.error || 'Failed to create event');
            }
        } catch (error) {
            toast.error('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const isDefaultImage = formData.thumbnail === '/event-placeholder.png';

    return (
        <div className={styles.container}>
            <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.title}
            >
                Host an Event
            </motion.h1>

            <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                onSubmit={handleSubmit}
                className={styles.form}
            >
                <div className={styles.formGroup}>
                    <label className={styles.label}>Event Banner</label>
                    <ImageUpload
                        value={isDefaultImage ? '' : formData.thumbnail}
                        onChange={handleImageChange}
                        label="Upload Event Banner"
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="clubId">Hosting Club</label>
                    <select
                        id="clubId"
                        name="clubId"
                        className={styles.select}
                        value={formData.clubId}
                        onChange={handleChange}
                        required
                    >
                        {adminClubs.map(club => (
                            <option key={club?.id} value={club?.id}>
                                {club?.name}
                            </option>
                        ))}
                    </select>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                        * You are posting this event on behalf of <strong>{adminClubs.find(c => c?.id === formData.clubId)?.name}</strong>
                    </p>
                </div>

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
                        placeholder="e.g. Intro to AI Workshop"
                    />
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
                        {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="price">Registration Fee (USD)</label>
                    <input
                        type="number"
                        id="price"
                        name="price"
                        min="0"
                        step="0.01"
                        required
                        className={styles.input}
                        value={formData.price}
                        onChange={handleChange}
                        placeholder="0.00 for free events"
                    />
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                        * Set to 0 if the event is free.
                    </p>
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
                        placeholder="e.g. Auditorium, Lab 3"
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
                        placeholder="Describe the event details..."
                    />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isLoading}>
                    {isLoading ? 'Creating Event...' : 'Create Event'}
                </button>
            </motion.form>
        </div>
    );
}
