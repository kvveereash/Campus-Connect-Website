import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Skeleton, { LoadingRegion } from '@/components/Skeleton';
import styles from './page.module.css';

/* Built from the page's own classes, so the real page lands in the same
   boxes: the title, photo and facts do not move when it arrives. The fixed
   words (back link, section and fact labels) are real text.

   The cost: the response starts before the event is looked up, so a missing
   event is sent as 200 with a noindex tag (Next adds it) rather than a 404.
   Search engines drop it either way; e2e/smoke.spec.ts checks that they do. */
export default function EventLoading() {
    return (
        <LoadingRegion label="Loading event" className={styles.page}>
            <Link href="/events" className={styles.back}>
                <ArrowLeft size={13} aria-hidden="true" />
                All events
            </Link>

            <header className={styles.masthead}>
                <div className={styles.eyebrow}>
                    <Skeleton width="180px" height="11px" />
                </div>
                <div className={styles.title} style={{ display: 'grid', gap: '0.14em' }}>
                    <Skeleton width="min(100%, 12ch)" height="0.86em" />
                    <Skeleton width="min(80%, 8ch)" height="0.86em" />
                </div>
                <div className={styles.host}>
                    <Skeleton width="240px" height="15px" />
                </div>
            </header>

            <div className={styles.hero}>
                <Skeleton height="100%" borderRadius="0" onDark />
            </div>

            <div className={styles.body}>
                <div>
                    <p className={styles.sectionLabel}>About</p>
                    <div style={{ display: 'grid', gap: '12px', maxWidth: '64ch' }}>
                        <Skeleton height="18px" />
                        <Skeleton height="18px" />
                        <Skeleton width="72%" height="18px" />
                    </div>
                </div>
                <dl className={styles.facts}>
                    {['When', 'Where', 'Entry'].map((key) => (
                        <div key={key} className={styles.fact}>
                            <dt className={styles.factKey}>{key}</dt>
                            <dd className={styles.factValue}>
                                <Skeleton width="70%" height="15px" />
                            </dd>
                        </div>
                    ))}
                </dl>
            </div>
        </LoadingRegion>
    );
}
