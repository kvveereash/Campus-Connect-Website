import type { Metadata } from 'next';
import LegalPage from '../LegalPage';
import styles from '../legal.module.css';

export const metadata: Metadata = {
    title: 'Community Guidelines',
    description: 'What belongs on Campus Connect, what does not, and what happens then.',
};

export default function GuidelinesPage() {
    return (
        <LegalPage
            label="Community"
            title="How to behave here."
            current="/legal/guidelines"
            lede="Campus Connect is a campus noticeboard, and it works the way a noticeboard does: what you put up has your name on it and everyone can see it. That is most of what you need to know."
        >
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>What belongs here</h2>
                <ul className={styles.list}>
                    <li>
                        <b>Events that are actually happening,</b> described as they actually are.
                        The date, the venue and the price should be right.
                    </li>
                    <li>
                        <b>Clubs that exist,</b> with a description a prospective member would
                        recognise.
                    </li>
                    <li>
                        <b>Posts about your club:</b> what you are doing, what you are recruiting
                        for, what happened last week.
                    </li>
                    <li>
                        <b>Asking for teammates</b> before a hackathon, and saying honestly what
                        you can and cannot do.
                    </li>
                </ul>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>What does not</h2>
                <ul className={styles.list}>
                    <li>
                        <b>Harassment, threats, or abuse</b> aimed at a person or a group. This is
                        the one with no second chance.
                    </li>
                    <li>
                        <b>Hate speech</b> — targeting anyone over caste, religion, region,
                        gender, sexuality, disability or anything else of that kind.
                    </li>
                    <li>
                        <b>Someone else&rsquo;s private information:</b> phone numbers, addresses,
                        photographs of people who have not agreed to be posted.
                    </li>
                    <li>
                        <b>Impersonation</b> of another student, a club, a college or a member of
                        staff.
                    </li>
                    <li>
                        <b>Spam:</b> the same post to several clubs, unrelated promotion, or
                        anything selling something that is not a campus event.
                    </li>
                    <li>
                        <b>Events that are not real,</b> or listings whose price or venue is
                        deliberately wrong. Money changes hands here, and a false listing is
                        fraud rather than a mistake.
                    </li>
                    <li>
                        <b>Anything illegal,</b> or anything encouraging it.
                    </li>
                </ul>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>What happens if you break them</h2>
                <p>
                    There is no elaborate process, because there is no elaborate team. A club
                    administrator can remove anything from their own feed. A site administrator
                    can remove any post, unpublish any event or club, and remove an account
                    entirely. Every one of those actions is written to an audit log with who did
                    it and when.
                </p>
                <p>
                    Most things get a removal and a note. Harassment, doxxing and fraudulent
                    listings get the account removed without one.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Reporting something</h2>
                <p>
                    There is no report button yet — saying so is more useful than a button that
                    goes nowhere. Until there is, email{' '}
                    <a href="mailto:veereashkv@gmail.com">veereashkv@gmail.com</a> with a link to
                    the post or event and what is wrong with it. Anything involving someone&rsquo;s
                    safety is dealt with first.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>One thing worth repeating</h2>
                <p>
                    Chat messages are stored as plain text and are not end-to-end encrypted. An
                    administrator with database access could read them. Treat the chat as you
                    would a message on a noticeboard, not a private one.
                </p>
            </section>
        </LegalPage>
    );
}
