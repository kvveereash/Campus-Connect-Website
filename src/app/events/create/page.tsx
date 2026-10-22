'use client';

import { useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Briefcase, Calendar, Code, Cpu, Globe, Lock as LockIcon, Megaphone, Palette, Sparkles, Trophy, Users, Wrench } from 'lucide-react';
import { createEvent } from '@/lib/actions';
import { useAuth } from '@/context/AuthContext';
import ImageUpload from '@/components/ImageUpload';
import styles from './page.module.css';
import entrance from '@/components/entrance.module.css';

/**
 * Matches the categories events actually carry. The previous list offered
 * "Fest", "Tech Talk" and "Seminar" — none of which exist elsewhere in the
 * app — so an event created here got a category with no ink on the listing
 * and no filter tab to find it under.
 */
const after = (seconds: number) => ({ '--delay': `${seconds}s` }) as CSSProperties;

const CATEGORIES = [
    { value: 'Technology', Icon: Cpu, label: 'Technology' },
    { value: 'Hackathon', Icon: Code, label: 'Hackathon' },
    { value: 'Workshop', Icon: Wrench, label: 'Workshop' },
    { value: 'Cultural', Icon: Globe, label: 'Cultural' },
    { value: 'Social', Icon: Users, label: 'Social' },
    { value: 'Art', Icon: Palette, label: 'Art' },
    { value: 'Sports', Icon: Trophy, label: 'Sports' },
    { value: 'Business', Icon: Briefcase, label: 'Business' },
];

export default function CreateEventPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const adminClubs = user?.clubMemberships?.filter(m => m.role === 'ADMIN').map(m => m.club) || [];

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: '',
        venue: '',
        // Signup always assigns a real college, so this is populated in
        // practice. It previously fell back to a mock id ('c1') that does not
        // exist in the database, which would have failed the foreign key.
        hostCollegeId: user?.collegeId || '',
        category: CATEGORIES[0].value,
        thumbnail: '/event-placeholder.png',
        clubId: adminClubs.length > 0 ? adminClubs[0]?.id || '' : '',
        price: 0,
    });

    // The club picker defaults to your first club. Derived on each render, so
    // it is right as soon as your clubs load, without an effect copying it in.
    const clubId = formData.clubId || adminClubs[0]?.id || '';

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (url: string) => {
        setFormData(prev => ({ ...prev, thumbnail: url }));
    };

    if (!user) return null;

    // Access Denied
    if (adminClubs.length === 0) {
        return (
            <div className={styles.pageWrapper}>
                <Link href="/events" className={styles.backBtn}>
                    <ArrowLeft size={16} className={styles.backArrow} />
                    Back to Events
                </Link>
                <div className={styles.accessDenied}>
                    <LockIcon size={40} strokeWidth={1.5} className={styles.accessDeniedIcon} aria-hidden="true" />
                    <h2 className={styles.accessDeniedTitle}>Club Admin Required</h2>
                    <p className={styles.accessDeniedText}>
                        Events must be hosted by an official club. Create or join a club first to start hosting events.
                    </p>
                    <Link href="/clubs" className={styles.accessDeniedBtn}>
                        Browse Clubs
                        <ArrowRight size={16} />
                    </Link>
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
                clubId,
                price: Number(formData.price) || 0,
            };

            const result = await createEvent(submissionData);
            if (result.success) {
                toast.success('Event created successfully!');
                await new Promise(resolve => setTimeout(resolve, 1000));
                router.push('/events');
            } else {
                toast.error(result.error || 'Failed to create event');
            }
        } catch {
            toast.error('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const isDefaultImage = formData.thumbnail === '/event-placeholder.png';
    const selectedClubName = adminClubs.find(c => c?.id === clubId)?.name;

    return (
        <div className={styles.pageWrapper}>
            {/* Back Navigation */}
            <div className={entrance.slideIn}>
                <Link href="/events" className={styles.backBtn}>
                    <ArrowLeft size={16} className={styles.backArrow} />
                    Back to Events
                </Link>
            </div>

            {/* Split Layout */}
            <div className={styles.splitLayout}>
                {/* Left: Decorative Panel */}
                <div className={`${styles.sidePanel} ${entrance.slideIn}`}>
                    <div className={styles.sidePanelBg} />

                    <div className={styles.sideContent}>
                        
                        <h2 className={styles.sideTitle}>
                            Create an <span className={styles.sideHighlight}>Unforgettable</span> Event
                        </h2>
                        <p className={styles.sideDesc}>
                            From hackathons to cultural fests — bring your vision to life
                            and reach students across campuses.
                        </p>
                    </div>

                    <ul className={styles.featureList}>
                        <li className={`${styles.featureItem} ${entrance.slideIn}`} style={after(0.3)}>
                            <span className={styles.featureIcon}>
                                <Megaphone size={16} />
                            </span>
                            Reach thousands of students
                        </li>
                        <li className={`${styles.featureItem} ${entrance.slideIn}`} style={after(0.4)}>
                            <span className={styles.featureIcon}>
                                <Users size={16} />
                            </span>
                            Manage registrations easily
                        </li>
                        <li className={`${styles.featureItem} ${entrance.slideIn}`} style={after(0.5)}>
                            <span className={styles.featureIcon}>
                                <Calendar size={16} />
                            </span>
                            Auto-sync with campus calendar
                        </li>
                    </ul>

                    <div className={styles.dotsGrid}>
                        {Array.from({ length: 15 }).map((_, i) => (
                            <div key={i} className={styles.dot} />
                        ))}
                    </div>
                </div>

                {/* Right: Form */}
                <div className={`${styles.formPanel} ${entrance.rise}`} style={after(0.2)}>
                    <div className={styles.formHeader}>
                        <h1 className={styles.formTitle}>Host an Event</h1>
                        <p className={styles.formSubtitle}>Fill in the details to publish your event</p>

                        {/* Hosting Club Badge */}
                        {adminClubs.length > 0 && (
                            <div className={styles.clubBadge}>
                                <Users size={14} className={styles.clubBadgeIcon} />
                                Hosting as <strong>{selectedClubName}</strong>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        {/* Event Banner */}
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Event Banner</label>
                            <ImageUpload
                                value={isDefaultImage ? '' : formData.thumbnail}
                                onChange={handleImageChange}
                                label="Upload Event Banner"
                            />
                        </div>

                        {/* Hosting Club (if multiple) */}
                        {adminClubs.length > 1 && (
                            <div className={styles.formGroup}>
                                <label className={styles.label} htmlFor="clubId">
                                    Hosting Club <span className={styles.required}>*</span>
                                </label>
                                <select
                                    id="clubId"
                                    name="clubId"
                                    className={styles.select}
                                    value={clubId}
                                    onChange={handleChange}
                                    required
                                >
                                    {adminClubs.map(club => (
                                        <option key={club?.id} value={club?.id}>
                                            {club?.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Event Title */}
                        <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor="title">
                                Event Title <span className={styles.required}>*</span>
                            </label>
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

                        <div className={styles.divider} />

                        {/* Category Pills */}
                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                Category <span className={styles.required}>*</span>
                            </label>
                            <div className={styles.categoryGrid}>
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat.value}
                                        type="button"
                                        className={`${styles.categoryPill} ${formData.category === cat.value ? styles.categoryPillActive : ''}`}
                                        onClick={() => setFormData(prev => ({ ...prev, category: cat.value }))}
                                    >
                                        <span className={styles.pillIcon}><cat.Icon size={16} aria-hidden="true" /></span>
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Date & Venue Row */}
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label className={styles.label} htmlFor="date">
                                    Date & Time <span className={styles.required}>*</span>
                                </label>
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
                                <label className={styles.label} htmlFor="venue">
                                    Venue <span className={styles.required}>*</span>
                                </label>
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
                        </div>

                        {/* Fee */}
                        <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor="price">
                                Registration Fee (₹)
                            </label>
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
                                placeholder="0 for free events"
                            />
                            <span className={styles.hint}>Leave as 0 for free events</span>
                        </div>

                        <div className={styles.divider} />

                        {/* Description */}
                        <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor="description">
                                Description <span className={styles.required}>*</span>
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                required
                                className={styles.textarea}
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Describe the event — what will attendees learn, who should attend, what to bring..."
                            />
                            <span className={styles.hint}>
                                {formData.description.length}/300 characters
                            </span>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                'Creating Event...'
                            ) : (
                                <>
                                    <Sparkles size={18} />
                                    Publish Event
                                    <ArrowRight size={18} className={styles.submitIcon} />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
