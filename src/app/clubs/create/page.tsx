'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Sparkles, Zap, Trophy, Globe } from 'lucide-react';
import { createClub } from '@/lib/actions';
import { getCollegesList } from '@/lib/actions';
import { useAuth } from '@/context/AuthContext';
import ImageUpload from '@/components/ImageUpload';
import styles from './page.module.css';

const CATEGORIES = [
    { value: 'Technical', icon: '⚙️', label: 'Technical' },
    { value: 'Cultural', icon: '🎭', label: 'Cultural' },
    { value: 'Sports', icon: '⚽', label: 'Sports' },
    { value: 'Art', icon: '🎨', label: 'Art' },
    { value: 'Music', icon: '🎵', label: 'Music' },
    { value: 'Other', icon: '✨', label: 'Other' },
];

export default function CreateClubPage() {
    const router = useRouter();
    const { refreshUser } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [colleges, setColleges] = useState<{ id: string, name: string }[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: 'Technical',
        logo: '/club-logo-placeholder.png',
        collegeId: '',
        newCollegeName: ''
    });

    useEffect(() => {
        getCollegesList().then(setColleges);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (url: string) => {
        setFormData(prev => ({ ...prev, logo: url }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const submissionData = {
                ...formData,
                collegeId: formData.collegeId === 'Other' ? undefined : formData.collegeId,
                newCollegeName: formData.collegeId === 'Other' ? formData.newCollegeName : undefined
            };

            const result = await createClub(submissionData);
            if (result.success) {
                toast.success('Club created successfully!');
                await refreshUser();
                if (result.data && result.data.id) {
                    router.push(`/clubs/${result.data.id}`);
                } else {
                    router.push('/profile');
                }
            } else {
                toast.error(result.error || 'Failed to create club');
            }
        } catch (error) {
            toast.error('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const isDefaultImage = formData.logo === '/club-logo-placeholder.png';

    // Track completion for step indicator
    const step1Done = formData.name.length > 0;
    const step2Done = formData.collegeId.length > 0;
    const step3Done = formData.description.length > 0;

    return (
        <div className={styles.pageWrapper}>
            {/* Back Navigation */}
            <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
            >
                <Link href="/clubs" className={styles.backBtn}>
                    <ArrowLeft size={16} className={styles.backArrow} />
                    Back to Clubs
                </Link>
            </motion.div>

            {/* Split Layout */}
            <div className={styles.splitLayout}>
                {/* Left: Decorative Panel */}
                <motion.div
                    className={styles.sidePanel}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                    <div className={styles.sidePanelBg} />

                    <div className={styles.sideContent}>
                        <span className={styles.sideEmoji}>🚀</span>
                        <h2 className={styles.sideTitle}>
                            Build Your <span className={styles.sideHighlight}>Community</span>
                        </h2>
                        <p className={styles.sideDesc}>
                            Every great movement starts with a small group of passionate people.
                            Your club could be the next big thing on campus.
                        </p>
                    </div>

                    <ul className={styles.featureList}>
                        <motion.li
                            className={styles.featureItem}
                            initial={{ opacity: 0, x: -15 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <span className={styles.featureIcon}>
                                <Zap size={16} />
                            </span>
                            Instant visibility across campus
                        </motion.li>
                        <motion.li
                            className={styles.featureItem}
                            initial={{ opacity: 0, x: -15 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <span className={styles.featureIcon}>
                                <Globe size={16} />
                            </span>
                            Connect with students everywhere
                        </motion.li>
                        <motion.li
                            className={styles.featureItem}
                            initial={{ opacity: 0, x: -15 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <span className={styles.featureIcon}>
                                <Trophy size={16} />
                            </span>
                            Host events & grow your reach
                        </motion.li>
                    </ul>

                    {/* Decorative dots */}
                    <div className={styles.dotsGrid}>
                        {Array.from({ length: 15 }).map((_, i) => (
                            <div key={i} className={styles.dot} />
                        ))}
                    </div>
                </motion.div>

                {/* Right: Form */}
                <motion.div
                    className={styles.formPanel}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <div className={styles.formHeader}>
                        <h1 className={styles.formTitle}>Create Your Club</h1>
                        <p className={styles.formSubtitle}>Fill in the details below to get started</p>
                    </div>

                    {/* Step Indicator */}
                    <div className={styles.stepIndicator}>
                        <div className={`${styles.step} ${step1Done ? styles.stepDone : styles.stepActive}`}>
                            <span className={styles.stepNumber}>{step1Done ? '✓' : '1'}</span>
                            Identity
                        </div>
                        <div className={styles.stepLine} />
                        <div className={`${styles.step} ${step2Done ? styles.stepDone : step1Done ? styles.stepActive : ''}`}>
                            <span className={styles.stepNumber}>{step2Done ? '✓' : '2'}</span>
                            Details
                        </div>
                        <div className={styles.stepLine} />
                        <div className={`${styles.step} ${step3Done ? styles.stepDone : step2Done ? styles.stepActive : ''}`}>
                            <span className={styles.stepNumber}>{step3Done ? '✓' : '3'}</span>
                            About
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        {/* Club Name */}
                        <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor="name">
                                Club Name <span className={styles.required}>*</span>
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                required
                                className={styles.input}
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="e.g. Robotics Club"
                            />
                        </div>

                        {/* Logo Upload */}
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Club Logo</label>
                            <ImageUpload
                                value={isDefaultImage ? '' : formData.logo}
                                onChange={handleImageChange}
                                label="Upload Club Logo"
                            />
                        </div>

                        <div className={styles.divider} />

                        {/* Category Selection - Pills */}
                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                Category <span className={styles.required}>*</span>
                            </label>
                            <div className={styles.categoryGrid}>
                                {CATEGORIES.map(cat => (
                                    <motion.button
                                        key={cat.value}
                                        type="button"
                                        className={`${styles.categoryPill} ${formData.category === cat.value ? styles.categoryPillActive : ''}`}
                                        onClick={() => setFormData(prev => ({ ...prev, category: cat.value }))}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <span className={styles.pillIcon}>{cat.icon}</span>
                                        {cat.label}
                                    </motion.button>
                                ))}
                            </div>
                        </div>

                        {/* College */}
                        <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor="collegeId">
                                Associated College <span className={styles.required}>*</span>
                            </label>
                            <select
                                id="collegeId"
                                name="collegeId"
                                required
                                className={styles.select}
                                value={formData.collegeId}
                                onChange={handleChange}
                            >
                                <option value="">Select a College</option>
                                {colleges.map(college => (
                                    <option key={college.id} value={college.id}>
                                        {college.name}
                                    </option>
                                ))}
                                <option value="Other">Other (Add New)</option>
                            </select>
                        </div>

                        <AnimatePresence>
                            {formData.collegeId === 'Other' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className={styles.formGroup}
                                >
                                    <label className={styles.label} htmlFor="newCollegeName">
                                        New College Name <span className={styles.required}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="newCollegeName"
                                        name="newCollegeName"
                                        className={styles.input}
                                        value={formData.newCollegeName || ''}
                                        onChange={handleChange}
                                        placeholder="Enter the full name of your college"
                                        required
                                    />
                                    <span className={styles.hint}>This will create a new college entry</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

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
                                placeholder="Describe your club's mission, activities, and what makes it unique..."
                            />
                            <span className={styles.hint}>
                                {formData.description.length}/200 characters
                            </span>
                        </div>

                        {/* Submit */}
                        <motion.button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={isLoading}
                            whileHover={!isLoading ? { scale: 1.01 } : {}}
                            whileTap={!isLoading ? { scale: 0.98 } : {}}
                        >
                            {isLoading ? (
                                'Creating Club...'
                            ) : (
                                <>
                                    <Sparkles size={18} />
                                    Create Club
                                    <ArrowRight size={18} className={styles.submitIcon} />
                                </>
                            )}
                        </motion.button>
                    </form>
                </motion.div>
            </div>
        </div>
    );
}
