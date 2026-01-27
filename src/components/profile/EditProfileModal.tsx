import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '@/types';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import ImageUpload from '@/components/ImageUpload';
import styles from '@/app/profile/page.module.css'; // Reusing styles
import Button from '@/components/ui/Button';
import { getCollegesList } from '@/lib/actions';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    updateProfile: (data: Partial<User> & { customCollegeName?: string }) => void;
}

const profileSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    department: z.string().min(2, "Department is required"),
    year: z.string().min(1, "Year is required"),
    bio: z.string().max(160, "Bio cannot exceed 160 characters").optional(),
    skills: z.string().optional(),
    interests: z.string().optional(),
    avatar: z.string().optional(),
    collegeId: z.string().optional(),
    customCollegeName: z.string().optional()
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function EditProfileModal({ isOpen, onClose, user, updateProfile }: EditProfileModalProps) {
    const [colleges, setColleges] = useState<{ id: string, name: string }[]>([]);
    const [isCustomCollege, setIsCustomCollege] = useState(false);

    useEffect(() => {
        getCollegesList().then(data => {
            setColleges([...data, { id: 'other', name: 'Other / Add New College' }]);
        });
    }, []);

    const { register, control, handleSubmit, watch, formState: { errors } } = useForm({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: user.name,
            department: user.department || '',
            year: user.year || '',
            bio: user.bio || '',
            skills: user.skills?.join(', ') || '',
            interests: user.interests?.join(', ') || '',
            avatar: user.avatar || '',
            collegeId: user.collegeId || '',
            customCollegeName: ''
        }
    });

    const selectedCollegeId = watch('collegeId');

    useEffect(() => {
        if (selectedCollegeId === 'other') {
            setIsCustomCollege(true);
        } else {
            setIsCustomCollege(false);
        }
    }, [selectedCollegeId]);

    const onSubmit = (data: ProfileForm) => {
        const formData = data;

        const skillsArray = formData.skills ? formData.skills.split(',').map(s => s.trim()).filter(Boolean) : [];
        const interestsArray = formData.interests ? formData.interests.split(',').map(s => s.trim()).filter(Boolean) : [];

        updateProfile({
            ...formData,
            skills: skillsArray,
            interests: interestsArray,
            customCollegeName: isCustomCollege ? formData.customCollegeName : undefined
        });
        toast.success("Profile updated!");
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: "spring", duration: 0.3 }}
                className={styles.modalContent}
            >
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>Edit Profile</h2>
                    <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className={styles.formGrid}>
                        {/* Full Width - Profile Picture */}
                        <div className={styles.fullWidth}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Profile Picture</label>
                                <Controller
                                    control={control}
                                    name="avatar"
                                    render={({ field: { onChange, value } }) => (
                                        <ImageUpload
                                            value={value}
                                            onChange={onChange}
                                            label="Upload Profile Photo"
                                        />
                                    )}
                                />
                            </div>
                        </div>

                        {/* Left Column - Personal Info */}
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Full Name</label>
                            <input
                                className={styles.input}
                                placeholder="John Doe"
                                {...register('name')}
                            />
                            {errors.name && <span style={{ color: 'red', fontSize: '0.75rem' }}>{errors.name.message as string}</span>}
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Year</label>
                            <select className={styles.select} {...register('year')}>
                                <option value="">Select Year</option>
                                <option value="1st Year">1st Year</option>
                                <option value="2nd Year">2nd Year</option>
                                <option value="3rd Year">3rd Year</option>
                                <option value="4th Year">4th Year</option>
                                <option value="Graduated">Graduated</option>
                            </select>
                            {errors.year && <span style={{ color: 'red', fontSize: '0.75rem' }}>{errors.year.message as string}</span>}
                        </div>

                        {/* Full Width College Selection */}
                        <div className={styles.fullWidth}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>College</label>
                                <select
                                    className={styles.select}
                                    {...register('collegeId')}
                                >
                                    <option value="">Select College</option>
                                    {colleges.map(college => (
                                        <option key={college.id} value={college.id}>{college.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {isCustomCollege && (
                            <div className={styles.fullWidth}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Enter College Name</label>
                                    <input
                                        className={styles.input}
                                        placeholder="Type your college name..."
                                        {...register('customCollegeName')}
                                    />
                                    {errors.customCollegeName && <span style={{ color: 'red', fontSize: '0.75rem' }}>{errors.customCollegeName.message as string}</span>}
                                </div>
                            </div>
                        )}

                        <div className={styles.fullWidth}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Department</label>
                                <input
                                    className={styles.input}
                                    placeholder="Computer Science"
                                    {...register('department')}
                                />
                                {errors.department && <span style={{ color: 'red', fontSize: '0.75rem' }}>{errors.department.message as string}</span>}
                            </div>
                        </div>

                        {/* Full Width - Bio */}
                        <div className={styles.fullWidth}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Bio</label>
                                <textarea
                                    className={styles.textarea}
                                    rows={3}
                                    placeholder="Tell us about yourself..."
                                    {...register('bio')}
                                />
                                {errors.bio && <span style={{ color: 'red', fontSize: '0.75rem' }}>{errors.bio.message as string}</span>}
                                <p className={styles.helperText}>{watch('bio')?.length || 0}/160 characters</p>
                            </div>
                        </div>

                        {/* Full Width - Skills & Interests */}
                        <div className={styles.fullWidth}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Skills</label>
                                <input
                                    className={styles.input}
                                    placeholder="e.g. React, Python, Design"
                                    {...register('skills')}
                                />
                                <p className={styles.helperText}>Comma separated values. Used for AI matchmaking.</p>
                            </div>
                        </div>

                        <div className={styles.fullWidth}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Interests</label>
                                <input
                                    className={styles.input}
                                    placeholder="e.g. Hackathons, AI, Music"
                                    {...register('interests')}
                                />
                                <p className={styles.helperText}>Comma separated values.</p>
                            </div>
                        </div>
                    </div>

                    <div className={styles.modalActions}>
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit">Save Changes</Button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
