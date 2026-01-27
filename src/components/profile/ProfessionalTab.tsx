'use client';

import { useState, useRef } from 'react';
import { User, Achievement } from '@/types';
import styles from '@/app/profile/page.module.css';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface ProfessionalTabProps {
    user: User;
    updateProfile: (data: Partial<User>) => void;
}

// Validation Schemas
const achievementSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    date: z.string().min(1, "Date is required"),
    description: z.string().min(10, "Description must be at least 10 characters")
});

const skillSchema = z.object({
    skill: z.string().min(2, "Skill must be at least 2 characters")
});

const projectSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    link: z.string().url("Must be a valid URL").optional().or(z.literal(''))
});

const linkSchema = z.object({
    platform: z.string().min(2, "Platform name is required"),
    url: z.string().url("Must be a valid URL")
});

type AchievementForm = z.infer<typeof achievementSchema>;
type SkillForm = z.infer<typeof skillSchema>;
type ProjectForm = z.infer<typeof projectSchema>;
type LinkForm = z.infer<typeof linkSchema>;

export default function ProfessionalTab({ user, updateProfile }: ProfessionalTabProps) {
    // Resume State
    const [isResumeUploading, setIsResumeUploading] = useState(false);

    // Modals
    const [isAchievementModalOpen, setIsAchievementModalOpen] = useState(false);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

    // Forms
    const achievementForm = useForm<AchievementForm>({ resolver: zodResolver(achievementSchema) });
    const skillForm = useForm<SkillForm>({ resolver: zodResolver(skillSchema) });
    const projectForm = useForm<ProjectForm>({ resolver: zodResolver(projectSchema) });
    const linkForm = useForm<LinkForm>({ resolver: zodResolver(linkSchema) });

    // Handlers
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handlers
    const handleResumeUpload = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsResumeUploading(true);

        // Simulating upload (In a real app, you'd upload 'file' to S3/Blob storage)
        setTimeout(() => {
            // validating file type (basic)
            if (file.type === "application/pdf" || file.name.endsWith('.pdf') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
                // We'll store the filename as the URL for this demo since we don't have real storage
                updateProfile({ resumeUrl: file.name });
                toast.success(`Resume "${file.name}" updated successfully!`);
            } else {
                toast.error("Please upload a PDF or Word document.");
            }
            setIsResumeUploading(false);
        }, 1500);
    };

    const onAchievementSubmit = (data: AchievementForm) => {
        const achievement: Achievement = {
            id: Date.now().toString(),
            ...data
        };
        const currentAchievements = user?.achievements || [];
        updateProfile({ achievements: [...currentAchievements, achievement] });
        setIsAchievementModalOpen(false);
        achievementForm.reset();
        toast.success("Achievement added!");
    };

    const onSkillSubmit = (data: SkillForm) => {
        const currentSkills = user.skills || [];
        if (!currentSkills.includes(data.skill.trim())) {
            updateProfile({ skills: [...currentSkills, data.skill.trim()] });
            skillForm.reset();
            toast.success("Skill added!");
        } else {
            toast.error("Skill already exists!");
        }
    };

    const handleDeleteSkill = (skillToDelete: string) => {
        const currentSkills = user.skills || [];
        updateProfile({ skills: currentSkills.filter(s => s !== skillToDelete) });
    };

    const onProjectSubmit = (data: ProjectForm) => {
        const project: any = {
            id: Date.now().toString(),
            title: data.title,
            description: data.description,
            link: data.link
        };
        const currentProjects = user.projects || [];
        updateProfile({ projects: [...currentProjects, project] });
        setIsProjectModalOpen(false);
        projectForm.reset();
        toast.success("Project added!");
    };

    const onLinkSubmit = (data: LinkForm) => {
        const link: any = {
            id: Date.now().toString(),
            platform: data.platform,
            url: data.url
        };
        const currentLinks = user.portfolioLinks || [];
        updateProfile({ portfolioLinks: [...currentLinks, link] });
        setIsLinkModalOpen(false);
        linkForm.reset();
        toast.success("Link added!");
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
        >
            {/* Resume Section */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>
                        📄 Resume
                    </h3>
                </div>
                <div className={styles.resumeContainer}>
                    {user.resumeUrl ? (
                        <div className={styles.resumeInfo}>
                            <div className={styles.pdfIcon}>PDF</div>
                            <div>
                                <div style={{ fontWeight: 500 }}>{user.resumeUrl.split('/').pop()}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Uploaded just now</div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No resume uploaded yet</div>
                    )}

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx"
                        style={{ display: 'none' }}
                    />

                    <Button
                        onClick={handleResumeUpload}
                        disabled={isResumeUploading}
                        isLoading={isResumeUploading}
                    >
                        {user.resumeUrl ? 'Update Resume' : 'Upload Resume'}
                    </Button>
                </div>
            </div>

            {/* Achievements Section */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>
                        🏆 Achievements
                    </h3>
                    {(user.achievements && user.achievements.length > 0) && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsAchievementModalOpen(true)}
                            leftIcon={<span>+</span>}
                        >
                            Add New
                        </Button>
                    )}
                </div>

                <div className={styles.achievementList}>
                    {user.achievements && user.achievements.map((ach: any) => (
                        <div key={ach.id} className={styles.achievementItem}>
                            <div className={styles.achievementHeader}>
                                <h4 style={{ fontWeight: 600 }}>{ach.title}</h4>
                                <span className={styles.achievementDate}>{ach.date}</span>
                            </div>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{ach.description}</p>
                        </div>
                    ))}
                    <div className={styles.actionRow}>
                        {(!user.achievements || user.achievements.length === 0) && (
                            <div style={{ flex: 1, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No achievements added yet</div>
                        )}
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setIsAchievementModalOpen(true)}
                        >
                            Add Achievement
                        </Button>
                    </div>
                </div>
            </div>

            {/* Skills Section */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>
                        ⚡ Skills
                    </h3>
                </div>
                <div className={styles.skillsContainer}>
                    {user.skills && user.skills.map((skill: string) => (
                        <div key={skill} className={styles.skillTag}>
                            {skill}
                            <span
                                className={styles.deleteSkill}
                                onClick={() => handleDeleteSkill(skill)}
                            >
                                ×
                            </span>
                        </div>
                    ))}

                    {/* Skills Section form */}
                    <div className={styles.actionRow} style={{ width: '100%', alignItems: 'flex-start', flexDirection: 'column', gap: '0.5rem' }}>
                        {(!user.skills || user.skills.length === 0) && (
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>No skills added yet</div>
                        )}
                        <form onSubmit={skillForm.handleSubmit(onSkillSubmit)} className={styles.skillsForm} style={{ marginTop: 0 }}>
                            <div style={{ flex: 1 }}>
                                <Input
                                    placeholder="Add skill..."
                                    {...skillForm.register('skill')}
                                    error={skillForm.formState.errors.skill?.message}
                                />
                            </div>
                            <Button
                                type="submit"
                                variant="secondary"
                                className={styles.addSkillBtn}
                            >
                                +
                            </Button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Projects Section */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>
                        🚀 Project Showcase
                    </h3>
                    {(user.projects && user.projects.length > 0) && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsProjectModalOpen(true)}
                            leftIcon={<span>+</span>}
                        >
                            Add Project
                        </Button>
                    )}
                </div>
                <div className={styles.projectList}>
                    {user.projects && user.projects.map((project: any) => (
                        <div key={project.id} className={styles.projectCard}>
                            <h4 className={styles.projectTitle}>{project.title}</h4>
                            <p className={styles.projectDesc}>{project.description}</p>
                            {project.link && (
                                <a href={project.link} target="_blank" rel="noopener noreferrer" className={styles.projectLink}>
                                    View Project →
                                </a>
                            )}
                        </div>
                    ))}
                    <div className={styles.actionRow} style={user.projects && user.projects.length > 0 ? { gridColumn: '1 / -1' } : {}}>
                        {(!user.projects || user.projects.length === 0) && (
                            <div style={{ flex: 1, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No projects showcased yet</div>
                        )}
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setIsProjectModalOpen(true)}
                        >
                            Add Project
                        </Button>
                    </div>
                </div>
            </div>

            {/* Portfolio Links */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>
                        🔗 Portfolio & Socials
                    </h3>
                    {(user.portfolioLinks && user.portfolioLinks.length > 0) && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsLinkModalOpen(true)}
                            leftIcon={<span>+</span>}
                        >
                            Add Link
                        </Button>
                    )}
                </div>
                <div className={styles.portfolioList}>
                    {user.portfolioLinks && user.portfolioLinks.map((link: any) => (
                        <div key={link.id} className={styles.portfolioItem}>
                            <div className={styles.linkInfo}>
                                <span className={styles.platformName}>{link.platform}</span>
                                <span className={styles.linkUrl}>{link.url}</span>
                            </div>
                            <a href={link.url} target="_blank" rel="noopener noreferrer" className={styles.externalLink}>
                                Visit ↗
                            </a>
                        </div>
                    ))}
                    <div className={styles.actionRow}>
                        {(!user.portfolioLinks || user.portfolioLinks.length === 0) && (
                            <div style={{ flex: 1, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No links added yet</div>
                        )}
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setIsLinkModalOpen(true)}
                        >
                            Add Link
                        </Button>
                    </div>
                </div>
            </div>

            {/* --- Modals --- */}
            {/* Add Achievement Modal */}
            {
                isAchievementModalOpen && (
                    <div className={styles.modalOverlay}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={styles.modalContent}
                        >
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Add Achievement</h2>
                            <form onSubmit={achievementForm.handleSubmit(onAchievementSubmit)}>
                                <div className={styles.formGroup}>
                                    <Input
                                        label="Title"
                                        placeholder="e.g. 1st Place in Hackathon"
                                        {...achievementForm.register('title')}
                                        error={achievementForm.formState.errors.title?.message}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <Input
                                        label="Date"
                                        placeholder="e.g. Dec 2025"
                                        {...achievementForm.register('date')}
                                        error={achievementForm.formState.errors.date?.message}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Description</label>
                                    <textarea
                                        className={styles.input}
                                        placeholder="Describe your achievement..."
                                        rows={3}
                                        {...achievementForm.register('description')}
                                    />
                                    {achievementForm.formState.errors.description && <span style={{ color: 'red', fontSize: '0.75rem' }}>{achievementForm.formState.errors.description.message}</span>}
                                </div>
                                <div className={styles.modalActions}>
                                    <Button type="button" variant="outline" onClick={() => setIsAchievementModalOpen(false)}>Cancel</Button>
                                    <Button type="submit">Add Achievement</Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )
            }

            {/* Add Project Modal */}
            {
                isProjectModalOpen && (
                    <div className={styles.modalOverlay}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={styles.modalContent}
                        >
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Add Project</h2>
                            <form onSubmit={projectForm.handleSubmit(onProjectSubmit)}>
                                <div className={styles.formGroup}>
                                    <Input
                                        label="Project Title"
                                        placeholder="e.g. Campus Connect"
                                        {...projectForm.register('title')}
                                        error={projectForm.formState.errors.title?.message}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <Input
                                        label="Link (Optional)"
                                        placeholder="e.g. https://github.com/..."
                                        {...projectForm.register('link')}
                                        error={projectForm.formState.errors.link?.message}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Description</label>
                                    <textarea
                                        className={styles.input}
                                        placeholder="Describe your project..."
                                        rows={3}
                                        {...projectForm.register('description')}
                                    />
                                    {projectForm.formState.errors.description && <span style={{ color: 'red', fontSize: '0.75rem' }}>{projectForm.formState.errors.description.message}</span>}
                                </div>
                                <div className={styles.modalActions}>
                                    <Button type="button" variant="outline" onClick={() => setIsProjectModalOpen(false)}>Cancel</Button>
                                    <Button type="submit">Add Project</Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )
            }

            {/* Add Link Modal */}
            {
                isLinkModalOpen && (
                    <div className={styles.modalOverlay}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={styles.modalContent}
                        >
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Add Link</h2>
                            <form onSubmit={linkForm.handleSubmit(onLinkSubmit)}>
                                <div className={styles.formGroup}>
                                    <Input
                                        label="Platform Name"
                                        placeholder="e.g. GitHub, LinkedIn"
                                        {...linkForm.register('platform')}
                                        error={linkForm.formState.errors.platform?.message}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <Input
                                        label="URL"
                                        placeholder="e.g. https://..."
                                        {...linkForm.register('url')}
                                        error={linkForm.formState.errors.url?.message}
                                    />
                                </div>
                                <div className={styles.modalActions}>
                                    <Button type="button" variant="outline" onClick={() => setIsLinkModalOpen(false)}>Cancel</Button>
                                    <Button type="submit">Add Link</Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )
            }
        </motion.div >
    );
}
