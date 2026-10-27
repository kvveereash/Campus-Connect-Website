import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import styles from './fests.module.css';

/** On an event page: the fest it belongs to, and the way to its timetable. */
export default function FestLink({ fest }: { fest: { id: string; name: string } }) {
    return (
        <Link href={`/fests/${fest.id}`} className={styles.link}>
            <span className={styles.linkKicker}>Part of</span>
            <span className={styles.linkName}>{fest.name}</span>
            <span className={styles.linkCta}>
                See the timetable
                <ArrowRight size={14} aria-hidden="true" className={styles.linkArrow} />
            </span>
        </Link>
    );
}
