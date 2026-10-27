import type { Metadata } from 'next';
import Link from 'next/link';
import prisma from '@/lib/db';
import { GOING, readCertificateToken } from '@/lib/ticket';
import { formatIST } from '@/lib/format';
import styles from './page.module.css';

export const metadata: Metadata = { title: 'Certificate check', robots: { index: false, follow: false } };

/*
 * Where the QR code on a certificate leads: anyone (a recruiter, a college
 * office) can confirm that the named person really was checked in at that
 * event, and in which volunteer role if they held one. Shows only what is on
 * the certificate itself.
 */
export default async function CertificateCheckPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const registrationId = readCertificateToken(decodeURIComponent(token));
    // The role is looked up alongside, through the registration's own person
    // and event, so neither read waits on the other.
    const [registration, volunteered] = registrationId
        ? await Promise.all([
              prisma.eventRegistration.findFirst({
                  where: { id: registrationId, status: { in: [...GOING] }, checkedInAt: { not: null }, event: { deletedAt: null } },
                  select: {
                      id: true,
                      checkedInAt: true,
                      user: { select: { name: true } },
                      event: {
                          select: {
                              id: true,
                              title: true,
                              date: true,
                              club: { select: { name: true } },
                              hostCollege: { select: { name: true } },
                          },
                      },
                  },
              }),
              prisma.volunteerSignup.findFirst({
                  where: {
                      user: { registrations: { some: { id: registrationId } } },
                      role: { event: { registrations: { some: { id: registrationId } } } },
                  },
                  select: { role: { select: { name: true } } },
              }),
          ])
        : [null, null];

    if (!registration?.checkedInAt) {
        return (
            <div className={styles.wrap}>
                <div className={styles.card} data-state="bad">
                    <p className={styles.kicker}>Certificate check</p>
                    <h1 className={styles.title}>We could not verify this certificate.</h1>
                    <p className={styles.text}>
                        The link may be mistyped, or the certificate was not issued by Campus Connect. Ask the person for the
                        link printed under the QR code.
                    </p>
                </div>
            </div>
        );
    }

    const { event } = registration;
    const facts: [string, string][] = [
        ['Name', registration.user.name],
        ['Event', event.title],
        ['Date', formatIST(event.date, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })],
        ['Hosted by', [event.club?.name, event.hostCollege.name].filter(Boolean).join(', ')],
        ...(volunteered ? [['Volunteered as', volunteered.role.name] as [string, string]] : []),
        [
            'Checked in',
            `${formatIST(registration.checkedInAt, { day: 'numeric', month: 'short', year: 'numeric' })}, ${formatIST(registration.checkedInAt, { hour: 'numeric', minute: '2-digit' })}`,
        ],
        ['Code', registration.id.slice(-8).toUpperCase()],
    ];

    return (
        <div className={styles.wrap}>
            <div className={styles.card} data-state="ok">
                <p className={styles.kicker}>Certificate check</p>
                <h1 className={styles.title}>
                    This certificate is <em className="accent">genuine.</em>
                </h1>
                <p className={styles.text}>
                    {registration.user.name} took part in this event
                    {volunteered ? `, volunteered as ${volunteered.role.name},` : ''} and was checked in at the door by its organisers.
                </p>
                <dl className={styles.facts}>
                    {facts.map(([key, value]) => (
                        <div key={key} className={styles.fact}>
                            <dt>{key}</dt>
                            <dd>{value}</dd>
                        </div>
                    ))}
                </dl>
                <Link href={`/events/${event.id}`} className={styles.link}>
                    See the event
                </Link>
            </div>
        </div>
    );
}
