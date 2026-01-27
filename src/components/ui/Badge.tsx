import { Badge as BadgeType } from '@/types';
import styles from './Badge.module.css';

interface BadgeProps {
    badge: BadgeType;
}

export default function Badge({ badge }: BadgeProps) {
    return (
        <div className={styles.badge} role="img" aria-label={badge.name}>
            {badge.icon}
            <div className={styles.tooltip}>
                <span className={styles.tooltipTitle}>{badge.name}</span>
                <span className={styles.tooltipDesc}>{badge.description}</span>
            </div>
        </div>
    );
}
