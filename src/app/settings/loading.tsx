import Skeleton, { LoadingRegion } from '@/components/Skeleton';
import styles from './page.module.css';

export default function SettingsLoading() {
    return (
        <LoadingRegion label="Loading settings" className={styles.page}>
            <p className={styles.label}>Account</p>
            <h1 className={styles.title}>Settings.</h1>
            {['Signed in as', 'Change password', 'Delete account'].map((label) => (
                <section key={label} className={styles.section}>
                    <p className={styles.sectionLabel}>{label}</p>
                    <div style={{ display: 'grid', gap: '10px' }}>
                        <Skeleton width="60%" height="18px" />
                        <Skeleton width="40%" height="14px" />
                    </div>
                </section>
            ))}
        </LoadingRegion>
    );
}
