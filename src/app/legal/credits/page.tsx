import type { Metadata } from 'next';
import LegalPage from '../LegalPage';
import styles from '../legal.module.css';
import { allCampusPhotoCredits } from '@/lib/college-images';

export const metadata: Metadata = {
    title: 'Photo credits',
    description: 'Who took the campus photographs on Campus Connect, and the licences they are shared under.',
};

/**
 * The campus photographs come from Wikimedia Commons. Their licences let
 * anyone reuse them on condition that the photographer is credited and the
 * licence named, so every one is listed here with a link to its source page.
 */
export default function CreditsPage() {
    const credits = allCampusPhotoCredits();

    return (
        <LegalPage
            label="Credits"
            title="Photo credits."
            current="/legal/credits"
            lede="The campus photographs on Campus Connect were taken by the people below and shared on Wikimedia Commons under open licences. Thank you to each of them."
        >
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Campus photographs</h2>
                <ul>
                    {credits.map((c) => (
                        <li key={c.src}>
                            {c.college}: photo by{' '}
                            <a href={c.source} target="_blank" rel="noopener noreferrer">
                                {c.author}
                            </a>
                            , {c.license}
                        </li>
                    ))}
                </ul>
                <p>
                    Licences marked CC BY or CC BY-SA allow reuse with credit; the full terms are on each
                    photo&rsquo;s source page. Photos marked public domain carry no restrictions.
                </p>
            </section>
        </LegalPage>
    );
}
