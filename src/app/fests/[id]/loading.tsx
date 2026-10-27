import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Skeleton, { LoadingRegion } from '@/components/Skeleton';
import styles from './page.module.css';
import timetable from '../timetable.module.css';

/* The page's own classes, so the masthead and the first day of the
   timetable land where the real fest page puts them. */
export default function FestLoading() {
    return (
        <LoadingRegion label="Loading fest" className={styles.page}>
            <Link href="/fests" className={styles.back}>
                <ArrowLeft size={13} aria-hidden="true" />
                All fests
            </Link>

            <header className={styles.masthead}>
                <div className={styles.eyebrow}>
                    <Skeleton width="240px" height="12px" />
                </div>
                <div className={styles.title} style={{ display: 'grid', gap: '0.12em' }}>
                    <Skeleton width="min(100%, 9ch)" height="0.86em" />
                </div>
                <div className={styles.tagline}>
                    <Skeleton width="min(100%, 32ch)" height="20px" />
                </div>
            </header>

            <div className={styles.controls}>
                <Skeleton width="210px" height="44px" borderRadius="999px" />
            </div>

            <section className={styles.section}>
                <p className={styles.sectionLabel}>About</p>
                <div style={{ display: 'grid', gap: '12px', maxWidth: '64ch' }}>
                    <Skeleton height="17px" />
                    <Skeleton width="78%" height="17px" />
                </div>
            </section>

            <section className={styles.section}>
                <div className={timetable.day}>
                    <div className={timetable.dayHead}>
                        <Skeleton width="200px" height="22px" />
                    </div>
                    <div className={timetable.slots} style={{ display: 'grid', gap: '14px', paddingBlock: '18px' }}>
                        {Array.from({ length: 4 }, (_, i) => (
                            <Skeleton key={i} height="44px" borderRadius="10px" />
                        ))}
                    </div>
                </div>
            </section>
        </LoadingRegion>
    );
}
