'use client';

import { motion } from 'framer-motion';
import styles from '@/app/profile/page.module.css';

/** The pill segmented control under the hero; the black pill slides between tabs. */
export default function ProfileTabs<T extends string>({
    tabs,
    active,
    onChange,
}: {
    tabs: { key: T; label: string; count?: number }[];
    active: T;
    onChange: (tab: T) => void;
}) {
    return (
        <div className={styles.tabs} role="tablist" aria-label="Profile sections">
            {tabs.map((t) => (
                <button
                    key={t.key}
                    type="button"
                    className={`${styles.tab} ${active === t.key ? styles.activeTab : ''}`}
                    onClick={() => onChange(t.key)}
                    role="tab"
                    aria-selected={active === t.key}
                    aria-controls={`${t.key.toLowerCase()}-panel`}
                    id={`${t.key.toLowerCase()}-tab`}
                >
                    {active === t.key && (
                        <motion.span
                            layoutId="profileTabPill"
                            className={styles.activeTabLine}
                            transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                        />
                    )}
                    {t.label}
                    {typeof t.count === 'number' && <span className={styles.tabCount}>{t.count}</span>}
                </button>
            ))}
        </div>
    );
}
