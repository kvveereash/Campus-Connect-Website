'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, BookOpen, Briefcase, Cpu, Globe, Palette, Trophy, Users, Wrench } from 'lucide-react';
import { createClub } from '@/lib/actions';
import { getCollegesList } from '@/lib/actions';
import { useAuth } from '@/context/AuthContext';
import ImageUpload from '@/components/ImageUpload';
import styles from './page.module.css';

/** Mirrors the categories clubs actually carry, so a new club is findable. */
const CATEGORIES = [
    { value: 'Technology', Icon: Cpu },
    { value: 'Technical', Icon: Wrench },
    { value: 'Art', Icon: Palette },
    { value: 'Social', Icon: Users },
    { value: 'Sports', Icon: Trophy },
    { value: 'Cultural', Icon: Globe },
    { value: 'Literature', Icon: BookOpen },
    { value: 'Business', Icon: Briefcase },
];

const PLACEHOLDER_LOGO = '/club-logo-placeholder.png';
const OTHER_COLLEGE = 'Other';

// The same limits the server enforces (clubSchema), so the form says so first.
const NAME_MIN = 2;
const NAME_MAX = 100;
const ABOUT_MIN = 10;
const ABOUT_MAX = 5000;

export default function CreateClubPage() {
    const router = useRouter();
    const { refreshUser } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [colleges, setColleges] = useState<{ id: string; name: string }[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: 'Technical',
        logo: PLACEHOLDER_LOGO,
        collegeId: '',
        newCollegeName: '',
    });

    useEffect(() => {
        getCollegesList().then(setColleges);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (url: string) => {
        // "Remove image" sends '', which the schema rejects as an invalid URL,
        // so removing a logo blocked creating the club. Fall back to the
        // placeholder the schema accepts.
        setFormData((prev) => ({ ...prev, logo: url || PLACEHOLDER_LOGO }));
    };

    const isOtherCollege = formData.collegeId === OTHER_COLLEGE;
    const collegeName = isOtherCollege
        ? formData.newCollegeName.trim()
        : colleges.find((c) => c.id === formData.collegeId)?.name ?? '';

    const nameOk = formData.name.trim().length >= NAME_MIN;
    const collegeOk = isOtherCollege ? formData.newCollegeName.trim().length >= 3 : !!formData.collegeId;
    const aboutLength = formData.description.trim().length;
    const aboutOk = aboutLength >= ABOUT_MIN;
    const ready = nameOk && collegeOk && aboutOk;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ready) return;
        setIsLoading(true);

        try {
            const result = await createClub({
                ...formData,
                name: formData.name.trim(),
                description: formData.description.trim(),
                collegeId: isOtherCollege ? undefined : formData.collegeId,
                newCollegeName: isOtherCollege ? formData.newCollegeName.trim() : undefined,
            });

            if (result.success) {
                // New clubs wait for an admin before they are listed publicly.
                toast.success('Club submitted. It goes live once an admin approves it.');
                await refreshUser();
                router.push(result.data?.id ? `/clubs/${result.data.id}` : '/profile');
            } else {
                toast.error(result.error || 'Failed to create club');
            }
        } catch {
            toast.error('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const hasLogo = formData.logo !== PLACEHOLDER_LOGO;
    const previewName = formData.name.trim() || 'Your club';

    return (
        <div className={styles.page}>
            <Link href="/clubs" className={styles.back}>
                <ArrowLeft size={16} aria-hidden="true" />
                All clubs
            </Link>

            <header className={styles.masthead}>
                <p className={styles.label}>New society</p>
                <h1 className={styles.title}>
                    Start a club <em className="accent">people can find.</em>
                </h1>
                <p className={styles.lede}>
                    Four short sections. Your club appears on the clubs page once an admin has
                    approved it, and you run it from then on.
                </p>
            </header>

            <div className={styles.layout}>
                <form onSubmit={handleSubmit} className={styles.sheet} noValidate>
                    {/* 01 — name and logo */}
                    <section className={styles.section}>
                        <div className={styles.sectionHead}>
                            <span className={styles.step}>01</span>
                            <h2 className={styles.sectionTitle}>Name and logo</h2>
                        </div>

                        <div className={styles.field}>
                            <label className={styles.fieldLabel} htmlFor="name">Club name</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                required
                                maxLength={NAME_MAX}
                                className={styles.input}
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="e.g. Robotics Club"
                                autoComplete="off"
                            />
                        </div>

                        <div className={styles.field}>
                            <span className={styles.fieldLabel}>
                                Logo <span className={styles.optional}>optional</span>
                            </span>
                            <div className={styles.upload}>
                                <ImageUpload
                                    value={hasLogo ? formData.logo : ''}
                                    onChange={handleImageChange}
                                    label=""
                                />
                            </div>
                        </div>
                    </section>

                    {/* 02 — category */}
                    <section className={styles.section}>
                        <div className={styles.sectionHead}>
                            <span className={styles.step}>02</span>
                            <h2 className={styles.sectionTitle}>What it is about</h2>
                        </div>

                        <div className={styles.pills} role="radiogroup" aria-label="Category">
                            {CATEGORIES.map(({ value, Icon }) => (
                                <button
                                    key={value}
                                    type="button"
                                    role="radio"
                                    aria-checked={formData.category === value}
                                    className={styles.pill}
                                    onClick={() => setFormData((prev) => ({ ...prev, category: value }))}
                                >
                                    <Icon size={15} aria-hidden="true" />
                                    {value}
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* 03 — college */}
                    <section className={styles.section}>
                        <div className={styles.sectionHead}>
                            <span className={styles.step}>03</span>
                            <h2 className={styles.sectionTitle}>Where it meets</h2>
                        </div>

                        <div className={styles.field}>
                            <label className={styles.fieldLabel} htmlFor="collegeId">College</label>
                            <select
                                id="collegeId"
                                name="collegeId"
                                required
                                className={styles.select}
                                value={formData.collegeId}
                                onChange={handleChange}
                            >
                                <option value="">Choose a college</option>
                                {colleges.map((college) => (
                                    <option key={college.id} value={college.id}>
                                        {college.name}
                                    </option>
                                ))}
                                <option value={OTHER_COLLEGE}>My college is not listed</option>
                            </select>
                        </div>

                        {isOtherCollege && (
                            <div className={styles.field}>
                                <label className={styles.fieldLabel} htmlFor="newCollegeName">College name</label>
                                <input
                                    type="text"
                                    id="newCollegeName"
                                    name="newCollegeName"
                                    required
                                    maxLength={NAME_MAX}
                                    className={styles.input}
                                    value={formData.newCollegeName}
                                    onChange={handleChange}
                                    placeholder="The full name of your college"
                                />
                                <p className={styles.hint}>We will add it to the list of colleges.</p>
                            </div>
                        )}
                    </section>

                    {/* 04 — description */}
                    <section className={styles.section}>
                        <div className={styles.sectionHead}>
                            <span className={styles.step}>04</span>
                            <h2 className={styles.sectionTitle}>Tell people why to join</h2>
                        </div>

                        <div className={styles.field}>
                            <label className={styles.fieldLabel} htmlFor="description">About the club</label>
                            <textarea
                                id="description"
                                name="description"
                                required
                                maxLength={ABOUT_MAX}
                                className={styles.textarea}
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="What you do, when you meet, and who it is for."
                            />
                            {/* This said "0/200" while the real limits are 10 to 5000. */}
                            <p className={styles.hint}>
                                {aboutOk
                                    ? `${aboutLength.toLocaleString('en-IN')} / ${ABOUT_MAX.toLocaleString('en-IN')} characters`
                                    : `At least ${ABOUT_MIN} characters (${aboutLength} so far)`}
                            </p>
                        </div>
                    </section>

                    <div className={styles.submitRow}>
                        <Link href="/clubs" className={styles.cancel}>Cancel</Link>
                        <button type="submit" className={styles.submit} disabled={!ready || isLoading}>
                            {isLoading ? 'Submitting…' : 'Submit for approval'}
                        </button>
                    </div>
                </form>

                <aside className={styles.side} aria-label="Preview">
                    <p className={styles.sideLabel}>Preview</p>
                    <div className={styles.preview}>
                        <div className={styles.previewMedia}>
                            {hasLogo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={formData.logo} alt="" className={styles.previewImage} />
                            ) : (
                                <span className={styles.previewInitial}>{previewName.charAt(0).toUpperCase()}</span>
                            )}
                        </div>
                        <div className={styles.previewFoot}>
                            <h3 className={styles.previewName}>{previewName}</h3>
                            <span className={styles.previewCategory}>{formData.category}</span>
                        </div>
                        <p className={styles.previewMeta}>
                            {collegeName || 'Your college'}
                            <span className={styles.previewDivider}>/</span>
                            1 member
                        </p>
                    </div>

                    <ol className={styles.next}>
                        <li>
                            <span className={styles.nextStep}>1</span>
                            <div>
                                <p className={styles.nextTitle}>An admin reviews it</p>
                                <p className={styles.nextText}>Until then only you can see the club page.</p>
                            </div>
                        </li>
                        <li>
                            <span className={styles.nextStep}>2</span>
                            <div>
                                <p className={styles.nextTitle}>You are its admin</p>
                                <p className={styles.nextText}>Post to the club feed and host events under its name.</p>
                            </div>
                        </li>
                        <li>
                            <span className={styles.nextStep}>3</span>
                            <div>
                                <p className={styles.nextTitle}>People join</p>
                                <p className={styles.nextText}>It is listed with every other club, filterable by category.</p>
                            </div>
                        </li>
                    </ol>
                </aside>
            </div>
        </div>
    );
}
