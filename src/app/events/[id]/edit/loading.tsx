import Skeleton, { LoadingRegion } from '@/components/Skeleton';
import styles from './page.module.css';

// Without this the event page's skeleton (a photo and facts) would stand in for a form.
export default function EditEventLoading() {
    return (
        <LoadingRegion label="Loading event editor" className={styles.container}>
            <h1 className={styles.title}>Edit Event</h1>
            <div className={styles.form}>
                {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className={styles.formGroup}>
                        <Skeleton width="120px" height="14px" />
                        <Skeleton height="52px" borderRadius="0" />
                    </div>
                ))}
            </div>
        </LoadingRegion>
    );
}
