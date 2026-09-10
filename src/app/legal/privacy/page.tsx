import type { Metadata } from 'next';
import LegalPage from '../LegalPage';
import styles from '../legal.module.css';

export const metadata: Metadata = {
    title: 'Privacy Policy',
    description: 'What Campus Connect stores about you, why, and how to get rid of it.',
};

/**
 * Written from the schema and the integration list rather than from a
 * template, so every field named here is a column that exists and every
 * service named is one the app actually calls.
 */
export default function PrivacyPage() {
    return (
        <LegalPage
            label="Legal"
            title="What we keep, and why."
            current="/legal/privacy"
            lede="Campus Connect stores the least it can get away with: enough to sign you in, put your name on a registration, and let a club know who joined. This page lists all of it."
        >
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>What you give us</h2>
                <ul className={styles.list}>
                    <li>
                        <b>Your name and email address.</b> Required to make an account. Your name
                        appears next to anything you post and on the attendee list of events you
                        register for.
                    </li>
                    <li>
                        <b>Your password.</b> Stored only as a bcrypt hash. Nobody, including us,
                        can read it back — which is why a forgotten password has to be reset
                        rather than looked up.
                    </li>
                    <li>
                        <b>Optional profile details:</b> college, department, year, avatar, bio,
                        skills, interests, projects, achievements and portfolio links. Every one of
                        these is optional, and all of them are visible to anyone who opens your
                        profile.
                    </li>
                </ul>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>What we record as you use it</h2>
                <ul className={styles.list}>
                    <li>
                        <b>Your activity:</b> the events you register for, the clubs you join, the
                        posts and comments you write, and the badges those earn you.
                    </li>
                    <li>
                        <b>When you were last seen,</b> so the chat can show whether someone is
                        around.
                    </li>
                    <li>
                        <b>Messages you send</b> through the chat. These are stored in plain text
                        in the database. They are not end-to-end encrypted, and an administrator
                        with database access could read them. Do not use this chat for anything
                        you would mind being read.
                    </li>
                    <li>
                        <b>An audit log</b> of administrative actions — approving an event,
                        deleting a post — recording who did what and when.
                    </li>
                </ul>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Cookies</h2>
                <p>
                    One cookie, and it is not optional: a session token that keeps you signed in.
                    It is <strong>httpOnly</strong>, meaning JavaScript on the page cannot read
                    it, and it exists only so the server can tell it is still you between
                    requests. Signing out deletes it.
                </p>
                <p>
                    There is <strong>no analytics, no advertising, and no tracking</strong> of any
                    kind on this site — which is why you have not been asked to consent to
                    anything. There is nothing to consent to.
                </p>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Who else sees it</h2>
                <p>
                    Nothing is sold or shared for marketing. These are the services the app needs
                    to work, and what each one handles:
                </p>
                <dl className={styles.terms}>
                    <div className={styles.term}>
                        <dt>Supabase</dt>
                        <dd>Hosts the PostgreSQL database. Everything above lives here.</dd>
                    </div>
                    <div className={styles.term}>
                        <dt>Stripe</dt>
                        <dd>
                            Takes payment for paid events. Card details are entered on Stripe&rsquo;s
                            own checkout page and never touch this site — we only ever see whether
                            a payment succeeded.
                        </dd>
                    </div>
                    <div className={styles.term}>
                        <dt>Pusher</dt>
                        <dd>Delivers chat messages and notifications in real time.</dd>
                    </div>
                    <div className={styles.term}>
                        <dt>Upstash Redis</dt>
                        <dd>
                            Rate limiting. Holds counters against your account and IP for a short
                            window, to stop one person flooding the site.
                        </dd>
                    </div>
                    <div className={styles.term}>
                        <dt>Resend</dt>
                        <dd>Sends transactional email, such as a password reset.</dd>
                    </div>
                </dl>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Getting it back, or getting rid of it</h2>
                <p>
                    You can edit or clear any profile field yourself at any time. For a copy of
                    everything held about you, or for deletion, email the address below and it
                    will be done by hand — this project has no self-service export or delete
                    button yet, and saying so is more useful than pretending otherwise.
                </p>
                <p>
                    Deleting an account removes your profile and detaches your name from what you
                    posted. Registrations already recorded against a paid event are kept, because
                    they are part of a payment record.
                </p>
            </section>
        </LegalPage>
    );
}
