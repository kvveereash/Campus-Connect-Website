import { getReportQueue } from '@/lib/actions/reports';
import ReportsClient from './ReportsClient';
import styles from './reports.module.css';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
    const result = await getReportQueue();

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>Reports</h1>
                <p className={styles.lede}>
                    Oldest first. Remove takes the content down and tells its owner; dismiss closes the
                    reports and changes nothing.
                </p>
            </header>

            {result.success ? (
                <ReportsClient initialGroups={result.data} />
            ) : (
                <p className={styles.error} role="alert">
                    The queue did not load: {result.error} Refresh the page to try again.
                </p>
            )}
        </div>
    );
}
