'use client';

import React from 'react';
import styles from './Badge.module.css';
import { motion } from 'framer-motion';

interface BadgeProps {
    name: string;
    icon: string;
    description: string;
    earnedDate?: Date | string;
    className?: string;
}

export default function Badge({ name, icon, description, earnedDate, className }: BadgeProps) {
    const formattedDate = earnedDate
        ? new Date(earnedDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : null;

    return (
        <motion.div
            className={`${styles.badge} ${className || ''}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            data-tooltip={description}
        >
            <div className={styles.iconWrapper}>
                {icon}
            </div>
            <h4 className={styles.name}>{name}</h4>
            {formattedDate && (
                <span className={styles.earnedDate}>Earned {formattedDate}</span>
            )}
        </motion.div>
    );
}
