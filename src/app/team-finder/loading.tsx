import Skeleton, { LoadingRegion } from '@/components/Skeleton';
import styles from './page.module.css';

/* Matching takes the longest of any page (it scores every student at your
   college), so the heading is shown as soon as the page is asked for. */
export default function TeamFinderLoading() {
    return (
        <LoadingRegion label="Finding teammates" className={styles.page}>
            <header className={styles.masthead}>
                <div>
                    <p className={styles.label}>Team finder</p>
                    <h1 className={styles.title}>
                        Find your people for the <em className="accent">next build.</em>
                    </h1>
                    <div className={styles.lede}>
                        <Skeleton width="min(100%, 420px)" height="16px" />
                    </div>
                </div>
            </header>

            <ul className={styles.grid}>
                {Array.from({ length: 6 }, (_, i) => (
                    <li key={i}>
                        <div className={styles.card}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Skeleton width="44px" height="44px" borderRadius="50%" />
                                <div style={{ flex: 1, display: 'grid', gap: '8px' }}>
                                    <Skeleton width="60%" height="16px" />
                                    <Skeleton width="80%" height="12px" />
                                </div>
                            </div>
                            <Skeleton height="8px" borderRadius="999px" />
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <Skeleton width="64px" height="26px" borderRadius="999px" />
                                <Skeleton width="80px" height="26px" borderRadius="999px" />
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </LoadingRegion>
    );
}
