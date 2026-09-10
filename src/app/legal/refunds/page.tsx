import type { Metadata } from 'next';
import LegalPage from '../LegalPage';
import styles from '../legal.module.css';

export const metadata: Metadata = {
    title: 'Refunds & Cancellations',
    description:
        'What happens to your money if you cancel, or if an event does — for paid events on Campus Connect.',
};

/**
 * Refunds and cancellations on one page rather than two.
 *
 * Checklists tend to list them separately, and on a subscription product they
 * are separate things. Here they are two halves of one question — you cancel,
 * or the organiser does — and splitting them across two pages would mean two
 * thin pages that each send you to the other.
 */
export default function RefundsPage() {
    return (
        <LegalPage
            label="Legal"
            title="If plans change."
            current="/legal/refunds"
            lede="Most events on Campus Connect are free, and cancelling one costs nothing. This page is about the paid ones: what happens to your money when you cancel, and when an organiser does."
        >
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Free events</h2>
                <p>
                    Cancel whenever you like, right up to the start. Nothing is charged and
                    nothing is owed. Do cancel rather than simply not turning up — the attendee
                    count is what an organiser plans around.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Paid events: if you cancel</h2>
                <p>
                    Refunds are decided by the club or college running the event, not by Campus
                    Connect. The site takes payment on their behalf and passes the request on.
                </p>
                <ul className={styles.list}>
                    <li>
                        <b>Ask the organiser first.</b> Their name is on the event page, and they
                        are the ones who can approve it.
                    </li>
                    <li>
                        <b>Then email us</b> at{' '}
                        <a href="mailto:veereashkv@gmail.com">veereashkv@gmail.com</a> with the
                        event and the date you registered. Refunds are issued by hand through
                        Stripe; there is no self-service refund button yet.
                    </li>
                    <li>
                        <b>Money returns the way it arrived,</b> to the same card. Stripe
                        typically takes five to ten working days to settle it, and that part is
                        out of anyone here&rsquo;s hands.
                    </li>
                </ul>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Paid events: if the organiser cancels</h2>
                <p>
                    If an event is cancelled outright, everyone who paid is refunded in full,
                    without having to ask. If it is moved to a different date or venue and that no
                    longer works for you, that counts as a cancellation on your side and is
                    refunded in full too.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>If a payment goes wrong</h2>
                <ul className={styles.list}>
                    <li>
                        <b>Charged but not registered.</b> This happens when Stripe has taken the
                        payment but the confirmation has not reached the site yet. Open the event
                        page — it checks with Stripe and confirms your place. If it still has not
                        after an hour, email us; the money is not lost.
                    </li>
                    <li>
                        <b>Charged twice.</b> Email us. The duplicate is refunded in full, and
                        Stripe&rsquo;s record settles which charge was which.
                    </li>
                    <li>
                        <b>Payment abandoned partway.</b> Nothing is charged. Your registration
                        stays pending and you can pay again from the event page whenever you like.
                    </li>
                </ul>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>What is honestly true here</h2>
                <p>
                    This is a student project. Refunds are processed by one person, by hand,
                    through the Stripe dashboard — usually within a couple of days, but there is
                    no team behind it and no guaranteed turnaround. That is worth knowing before
                    you pay for something, which is why it is written down rather than left out.
                </p>
            </section>
        </LegalPage>
    );
}
