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
                                        src={college.logo || '/images/college-placeholder.png'}
                                        alt={`${college.name} campus`}
                                        fill
                                        className={styles.collegeImage}
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
