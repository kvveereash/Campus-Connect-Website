'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowRight } from 'lucide-react';
import { fadeInUp, staggerGrid, viewportOnce } from '@/lib/motion-variants';
import styles from './page.module.css';

interface College {
    id: string;
    name: string;
    location: string;
    description: string;
    logo: string;
}

interface CollegesClientProps {
    initialColleges: College[];
}

// Curated campus photography for consistent premium visuals
const CAMPUS_IMAGES = [
    'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&q=80&w=600', // grand campus building
    'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=600', // graduation caps
    'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=600', // campus aerial
    'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?auto=format&fit=crop&q=80&w=600', // university hall
    'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?auto=format&fit=crop&q=80&w=600', // modern campus
    'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&q=80&w=600', // library interior
    'https://images.unsplash.com/photo-1574958269340-fa927503f3dd?auto=format&fit=crop&q=80&w=600', // campus walkway
    'https://images.unsplash.com/photo-1580537659466-0a9bfa916a54?auto=format&fit=crop&q=80&w=600', // lecture hall
    'https://images.unsplash.com/photo-1519452635265-7b1fbfd1e4e0?auto=format&fit=crop&q=80&w=600', // study area
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=600', // campus quad
];

function getCollegeImage(college: College): string {
    const logo = college.logo;
    // Filter out low-quality sources: ui-avatars, placehold.co, placeholder.png, empty, or SVG-based cartoon logos
    const isLowQuality = !logo
        || logo.includes('ui-avatars.com')
        || logo.includes('placehold.co')
        || logo.includes('placeholder.png')
        || logo.includes('default-college')
        || logo.endsWith('.svg')
        || logo.includes('data:image');

    if (isLowQuality) {
        // Deterministic pick based on college name for consistency across renders
        const hash = college.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return CAMPUS_IMAGES[hash % CAMPUS_IMAGES.length];
    }

    // Only trust URLs that start with https:// and look like actual photos
    if (logo.startsWith('https://') || logo.startsWith('/')) {
        return logo;
    }

    // Fallback for anything else
    const hash = college.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return CAMPUS_IMAGES[hash % CAMPUS_IMAGES.length];
}

export default function CollegesClient({ initialColleges }: CollegesClientProps) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredColleges = initialColleges.filter(college =>
        college.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        college.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={styles.container}>
            <motion.div
                className={styles.header}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
                <h1 className={styles.title}>
                    Top <span className={styles.highlight}>Campuses</span>
                </h1>
                <p className={styles.subtitle}>
                    Explore premier institutes, their culture, and opportunities.
                </p>

                {/* Search Bar */}
                <div className={styles.searchWrapper}>
                    <Search size={18} className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Search colleges by name or location..."
                        className={styles.searchInput}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Stats Bar */}
                <div className={styles.statsBar}>
                    <div className={styles.stat}>
                        <div className={styles.statValue}>{initialColleges.length}</div>
                        <div className={styles.statLabel}>Campuses</div>
                    </div>
                    <div className={styles.stat}>
                        <div className={styles.statValue}>{initialColleges.length * 12}+</div>
                        <div className={styles.statLabel}>Clubs</div>
                    </div>
                    <div className={styles.stat}>
                        <div className={styles.statValue}>{initialColleges.length * 45}+</div>
                        <div className={styles.statLabel}>Events</div>
                    </div>
                </div>
            </motion.div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={searchTerm ? 'filtered' : 'all'}
                    className={styles.grid}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0 }}
                    variants={staggerGrid}
                >
                    {filteredColleges.map((college) => (
                        <motion.div
                            key={college.id}
                            variants={fadeInUp}
                            whileHover={{
                                y: -6,
                                transition: { type: 'spring', stiffness: 300, damping: 20 }
                            }}
                        >
                            <div className={styles.card}>
                                <div className={styles.imageContainer}>
                                    <Image
                                        src={getCollegeImage(college)}
                                        alt={`${college.name} campus`}
                                        fill
                                        className={styles.collegeImage}
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    />
                                </div>
                                <div className={styles.content}>
                                    <h2 className={styles.collegeName}>{college.name}</h2>
                                    <p className={styles.location}>📍 {college.location}</p>
                                    <p className={styles.description}>{college.description}</p>
                                    <div className={styles.footer}>
                                        <Link href={`/colleges/${college.id}`} className={styles.viewBtn}>
                                            View Details
                                            <ArrowRight size={16} className={styles.viewBtnArrow} />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </AnimatePresence>

            <AnimatePresence>
                {filteredColleges.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={styles.emptyState}
                    >
                        <div className={styles.emptyIcon}>🔍</div>
                        <p className={styles.emptyText}>
                            No colleges found matching &ldquo;{searchTerm}&rdquo;
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
