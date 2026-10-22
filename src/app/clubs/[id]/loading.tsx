import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Skeleton, { LoadingRegion } from '@/components/Skeleton';
import styles from './page.module.css';

/* The page's own classes, so the masthead and the two columns land where the
   real club page will put them. */
export default function ClubLoading() {
    return (
        <LoadingRegion label="Loading club" className={styles.page}>
            <Link href="/clubs" className={styles.back}>
                <ArrowLeft size={13} aria-hidden="true" />
                All clubs
            </Link>

            <header className={styles.masthead}>
                <div>
                    <div className={styles.eyebrow}>
                        <Skeleton width="200px" height="11px" />
                    </div>
                    <div className={styles.title} style={{ display: 'grid', gap: '0.14em' }}>
                        <Skeleton width="min(100%, 10ch)" height="0.86em" />
                        <Skeleton width="min(70%, 6ch)" height="0.86em" />
                    </div>
                    <div className={styles.college}>
                        <Skeleton width="180px" height="15px" />
                    </div>
                </div>
                <div className={styles.mark}>
                    <Skeleton height="100%" borderRadius="0" onDark />
                </div>
            </header>

            <div className={styles.controls}>
                <Skeleton width="120px" height="44px" borderRadius="999px" />
            </div>

            <div className={styles.body}>
                <div>
                    <section className={styles.section}>
                        <p className={styles.sectionLabel}>About</p>
                        <div style={{ display: 'grid', gap: '12px', maxWidth: '64ch' }}>
                            <Skeleton height="17px" />
                            <Skeleton width="82%" height="17px" />
                        </div>
                    </section>
                    <section className={styles.section}>
                        <p className={styles.sectionLabel}>Events</p>
                        <div style={{ display: 'grid', gap: '14px' }}>
                            {Array.from({ length: 3 }, (_, i) => (
                                <Skeleton key={i} height="52px" borderRadius="12px" />
                            ))}
                        </div>
                    </section>
                </div>
                <div className={styles.rail} style={{ display: 'grid', gap: '12px' }}>
                    <Skeleton width="40%" height="11px" />
                    {Array.from({ length: 5 }, (_, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Skeleton width="36px" height="36px" borderRadius="50%" />
                            <Skeleton width="60%" height="14px" />
                        </div>
                    ))}
                </div>
            </div>
        </LoadingRegion>
    );
}
