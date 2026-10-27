import { getPendingFests } from '@/lib/actions/fests';
import FestsQueue from './FestsQueue';
import styles from './fests.module.css';

export const dynamic = 'force-dynamic';

export default async function AdminFestsPage() {
    const result = await getPendingFests();

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>Fests</h1>
                <p className={styles.lede}>
                    Oldest first. Approve puts the fest and its approved events on the board; reject takes it down
                    and tells whoever started it, with your reason.
                </p>
            </header>

            {result.success ? (
                <FestsQueue initialFests={result.data} />
            ) : (
                <p className={styles.error} role="alert">
                    The queue did not load: {result.error} Refresh the page to try again.
                </p>
            )}
        </div>
    );
}
