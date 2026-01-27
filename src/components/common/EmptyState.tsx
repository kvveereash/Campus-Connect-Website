'use client';

import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';

import styles from './EmptyState.module.css';

interface EmptyStateProps {
    title: string;
    description: string;
    actionLabel?: string;
    actionLink?: string;
    onAction?: () => void;
    icon?: string;
    compact?: boolean;
}

export default function EmptyState({ title, description, actionLabel, actionLink, onAction, compact = false }: EmptyStateProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={styles.container}
            style={{ minHeight: compact ? '250px' : '400px' }}
        >
            <div className={styles.illustration}>
                {compact ? (
                    <div style={{ fontSize: '3rem' }}>🔭</div>
                ) : (
                    <svg width="160" height="160" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="100" cy="100" r="80" fill="#FF7D5D" fillOpacity="0.1" />
                        <path d="M140 140L160 160" stroke="#FF7D5D" strokeWidth="12" strokeLinecap="round" />
                        <circle cx="90" cy="90" r="50" stroke="#FF7D5D" strokeWidth="8" />
                        <path d="M70 90L110 90" stroke="#FF7D5D" strokeWidth="4" strokeLinecap="round" strokeOpacity="0.5" />
                        <path d="M70 70L110 70" stroke="#FF7D5D" strokeWidth="4" strokeLinecap="round" strokeOpacity="0.3" />
                        <path d="M70 110L90 110" stroke="#FF7D5D" strokeWidth="4" strokeLinecap="round" strokeOpacity="0.5" />

                        {/* Floating elements */}
                        <circle cx="150" cy="50" r="10" fill="#D1FAE5" fillOpacity="0.8">
                            <animate attributeName="cy" values="50;40;50" dur="3s" repeatCount="indefinite" />
                        </circle>
                        <circle cx="40" cy="150" r="8" fill="#E0C0F8" fillOpacity="0.8">
                            <animate attributeName="cy" values="150;160;150" dur="4s" repeatCount="indefinite" />
                        </circle>
                    </svg>
                )}
            </div>

            <h3 className={styles.title}>
                {title}
            </h3>
            <p className={styles.description}>
                {description}
            </p>

            {actionLabel && (
                actionLink ? (
                    <Button href={actionLink} variant="primary">
                        {actionLabel}
                    </Button>
                ) : (
                    <Button onClick={onAction} variant="primary">
                        {actionLabel}
                    </Button>
                )
            )}
        </motion.div>
    );
}
