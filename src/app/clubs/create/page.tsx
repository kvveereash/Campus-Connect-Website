'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { createClub } from '@/lib/actions';
import { getCollegesList } from '@/lib/actions';
import { useAuth } from '@/context/AuthContext';
import styles from '@/app/events/create/page.module.css';
import ImageUpload from '@/components/ImageUpload';

export default function CreateClubPage() {
    const router = useRouter();
    const { refreshUser } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [colleges, setColleges] = useState<{ id: string, name: string }[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: 'Technical',
        logo: '/club-logo-placeholder.png', // Default placeholder
        collegeId: ''
    });

    useEffect(() => {
        getCollegesList().then(setColleges);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Callback for ImageUpload
    const handleImageChange = (url: string) => {
        setFormData(prev => ({ ...prev, logo: url }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const result = await createClub(formData);
            if (result.success) {
                toast.success('Club created successfully!');
                await refreshUser(); // Update session to get new club admin status
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

    // Helper to check if using default or uploaded
    const isDefaultImage = formData.logo === '/club-logo-placeholder.png';

    return (
        <div className={styles.container}>
            <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.title}
            >
                Start a New Club
            </motion.h1>

            <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                onSubmit={handleSubmit}
                className={styles.form}
            >
                <div className={styles.formGroup}>
                    <label className={styles.label}>Club Logo</label>
                    <ImageUpload
                        value={isDefaultImage ? '' : formData.logo}
                        onChange={handleImageChange}
                        label="Upload Club Logo"
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="name">Club Name</label>
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

                <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="collegeId">Associated College</label>
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
                    </select>
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
                        <option value="Technical">Technical</option>
                        <option value="Cultural">Cultural</option>
                        <option value="Sports">Sports</option>
                        <option value="Art">Art</option>
                        <option value="Music">Music</option>
                        <option value="Other">Other</option>
                    </select>
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
                        placeholder="What is this club about?"
                    />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isLoading}>
                    {isLoading ? 'Creating Club...' : 'Create Club'}
                </button>
            </motion.form>
        </div>
    );
}
