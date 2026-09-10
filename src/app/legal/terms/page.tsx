import type { Metadata } from 'next';
import LegalPage from '../LegalPage';
import styles from '../legal.module.css';

export const metadata: Metadata = {
    title: 'Terms of Service',
    description: 'The rules for using Campus Connect, and what it does and does not promise.',
};

export default function TermsPage() {
    return (
        <LegalPage
            label="Legal"
            title="The deal."
            current="/legal/terms"
            lede="Campus Connect lists events and clubs across colleges and lets students register for them. These are the terms you accept by using it."
        >
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Your account</h2>
                <ul className={styles.list}>
                    <li>
                        <b>One account, real details.</b> Sign up with a name people would
                        recognise. Impersonating another student, a club or a college is grounds
                        for removal.
                    </li>
                    <li>
                        <b>You are responsible for what happens under it.</b> Keep your password
                        to yourself; anything posted from your account is treated as yours.
                    </li>
                    <li>
                        <b>Accounts can be removed</b> for breaking these terms or the{' '}
                        community guidelines.
                    </li>
                </ul>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Events and clubs</h2>
                <p>
                    Anyone with an account can submit an event or a club, but nothing appears
                    publicly until an administrator approves it. Approval is a check that the
                    listing is real and appropriately described — it is{' '}
                    <strong>not an endorsement</strong>, and it is not a guarantee that the event
                    will happen as advertised.
                </p>
                <p>
                    Events are run by the clubs and colleges that list them, not by Campus
                    Connect. If an event is cancelled, moved, oversubscribed or simply not what it
                    said it was, that is a matter between you and the organiser. Registering here
                    records your interest and, where an event is paid, takes payment on the
                    organiser&rsquo;s behalf.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>What you post</h2>
                <p>
                    You keep ownership of what you write. By posting it here you give Campus
                    Connect permission to display it on the site — nothing more. We do not license
                    it onward, sell it, or use it in promotion.
                </p>
                <p>
                    Posts and comments belong to a club, and club administrators can remove
                    anything on their own feed. Site administrators can remove anything anywhere.
                    Removals are recorded in an audit log.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Paid events</h2>
                <p>
                    Payments are handled by Stripe. Card details are entered on Stripe&rsquo;s own
                    checkout and never reach this site. A registration is only confirmed once
                    Stripe reports the payment as complete, which is why a place can sit as
                    pending for a moment after you pay.
                </p>
                <p>
                    Refunds and cancellations are covered on their own page, and those terms form
                    part of these.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>What this does not promise</h2>
                <p>
                    Said plainly, because the alternative is a paragraph of legal boilerplate that
                    means the same thing: <strong>this is a student project.</strong> It is
                    provided as it is. There is no uptime guarantee, no support commitment, and no
                    warranty that it will keep working or keep your data intact — although real
                    care has gone into making sure it does.
                </p>
                <p>
                    To the extent the law allows, Campus Connect is not liable for loss arising
                    from using it, from an event you found through it, or from it being
                    unavailable when you needed it.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Changes</h2>
                <p>
                    These terms can change. The date at the top of this page is when they last
                    did. Continuing to use the site after a change means accepting it.
                </p>
            </section>
        </LegalPage>
    );
}
