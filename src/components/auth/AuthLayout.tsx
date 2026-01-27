'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import styles from './AuthLayout.module.css';
import FloatingParticles from '../FloatingParticles';

interface AuthLayoutProps {
    children: ReactNode;
    title: string;
    subtitle: string;
    imageSrc?: string;
}

export default function AuthLayout({ children, title, subtitle, imageSrc = "/auth-hero.png" }: AuthLayoutProps) {
    return (
        <div className={styles.container}>
            {/* Left Side: Brand Visuals */}
            <div className={styles.imageSection}>
                <div className={`${styles.orb} ${styles.orb1}`} />
                <div className={`${styles.orb} ${styles.orb2}`} />

                {/* Animated Floating Particles */}
                <FloatingParticles count={25} />

                {/* Hero Image - Student Sitting */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '75%',
                        zIndex: 5,
                        pointerEvents: 'none',
                        maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%)'
                    }}
                >
                    <Image
                        src={imageSrc}
                        alt="Campus Connect Hero"
                        fill
                        style={{ objectFit: 'contain', objectPosition: 'bottom center' }}
                        priority
                    />
                </motion.div>

                <div className={styles.imageContent} style={{ justifyContent: 'flex-start', paddingTop: '15vh', background: 'transparent', backdropFilter: 'none' }}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        style={{ position: 'relative', zIndex: 20 }}
                    >
                        <h1 className={styles.heading}>{title}</h1>
                        <p className={styles.subheading}>{subtitle}</p>
                    </motion.div>
                </div>
            </div>

            {/* Right Side: Form */}
            <div className={styles.formSection}>
                <div className={styles.formWrapper}>
                    {children}
                </div>
            </div>
        </div>
    );
}
