'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { COLLEGES } from '@/lib/data';
import styles from './page.module.css';

export default function CollegesPage() {
    return (
        <CollegesContent />
    );
}

function CollegesContent() {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredColleges = COLLEGES.filter(college =>
        college.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        college.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>
                    Top <span className={styles.highlight}>Campuses</span>
                </h1>
                <p className={styles.subtitle}>
                    Explore premier institutes, their culture, and opportunities.
                </p>

                {/* Search Bar */}
                <div style={{ marginTop: '2rem', maxWidth: '500px', margin: '2rem auto 0', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem' }}>🔍</span>
                    <input
                        type="text"
                        placeholder="Search colleges by name or location..."
                        style={{
                            width: '100%',
                            padding: '1rem 1rem 1rem 3rem',
                            borderRadius: '2rem',
                            border: '1px solid var(--border-color)',
                            fontSize: '1rem',
                            outline: 'none',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                        }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles.grid}>
                {filteredColleges.map((college) => (
                    <div key={college.id} className={styles.card}>
                        <div className={styles.imageContainer}>
                            <Image
                                src={college.logo}
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
                                <Link href={`/colleges/${college.id}`} className="btn btn-outline" style={{ width: '100%', display: 'block', textAlign: 'center' }}>
                                    View Details
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredColleges.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    No colleges found matching "{searchTerm}"
                </div>
            )}
        </div>
    );
}
