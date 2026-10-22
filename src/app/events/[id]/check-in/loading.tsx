import Skeleton, { LoadingRegion } from '@/components/Skeleton';
import styles from '../organiser.module.css';

// Without this the event page's skeleton would show at the door.
export default function CheckInLoading() {
    return (
        <LoadingRegion label="Reading ticket" className={styles.page}>
            <Skeleton width="140px" height="11px" />
            <p className={styles.label}>Door</p>
            <div className={styles.door}>
                <Skeleton width="88px" height="88px" borderRadius="50%" />
                <Skeleton width="120px" height="12px" />
                <Skeleton width="min(100%, 280px)" height="36px" />
                <Skeleton width="220px" height="52px" borderRadius="999px" />
            </div>
        </LoadingRegion>
    );
}
