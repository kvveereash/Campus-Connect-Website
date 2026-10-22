'use client';

import React from 'react';
import styles from './Badge.module.css';
import entrance from './entrance.module.css';
import { formatIST } from '@/lib/format';

interface BadgeProps {
    name: string;
    icon: string;
    description: string;
    earnedDate?: Date | string;
    className?: string;
}

export default function Badge({ name, icon, description, earnedDate, className }: BadgeProps) {
    const formattedDate = earnedDate
        ? formatIST(earnedDate, { month: 'short', year: 'numeric' })
        : null;

    return (
        <div
            className={`${styles.badge} ${entrance.pop} ${className || ''}`}
            data-tooltip={description}
        >
            <div className={styles.iconWrapper}>
                {icon}
            </div>
            <h4 className={styles.name}>{name}</h4>
            {formattedDate && (
                <span className={styles.earnedDate}>Earned {formattedDate}</span>
            )}
        </div>
    );
}
