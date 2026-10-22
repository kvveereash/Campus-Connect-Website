import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Check } from 'lucide-react';
import type { EventWithRelations } from '@/lib/actions';
import type { LandingStats, CategoryBandItem, FeaturedClub } from '@/lib/actions/landing';
import { inkFor } from './events/press';
import { resolveEventImage } from '@/lib/college-images';
import HomeMotion from './HomeMotion';
import CollegeIndex, { type LandingCollege } from './CollegeIndex';
import TryDemo from '@/components/TryDemo';
import styles from './home.module.css';

export type { LandingCollege };

interface LandingProps {
    events: EventWithRelations[];
    stats: LandingStats;
    categories: CategoryBandItem[];
    clubs: FeaturedClub[];
    /** Titles of upcoming events, for the running band. Real, or nothing. */
    marquee: string[];
    /** The busiest colleges on the board. */
    colleges: LandingCollege[];
}

/**
 * Dates on this page are written for the people reading it, who are on
 * Indian time. The server renders in UTC, so an event at 1am IST used to be
 * printed as the day before.
 */
const IST = 'Asia/Kolkata';
function istParts(value: Date | string) {
    const d = new Date(value);
    if (isNaN(d.getTime())) return { day: '--', month: '—', weekday: '—', time: '' };
    const get = (opts: Intl.DateTimeFormatOptions) =>
        new Intl.DateTimeFormat('en-IN', { timeZone: IST, ...opts }).format(d);
    return {
        day: get({ day: '2-digit' }),
        month: get({ month: 'short' }),
        weekday: get({ weekday: 'short' }),
        time: get({ hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase(),
    };
}

const priceLabel = (price: number) => (price > 0 ? `₹${price.toLocaleString('en-IN')}` : 'Free');

/** Used for the hero deck only when there are fewer real events than cards. */
const FALLBACK_DECK = [
    { title: 'Campus hackathon', category: 'Hackathon', photo: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80' },
    { title: 'Cultural night', category: 'Cultural', photo: '/images/campus/cultural-night-lights.jpg' },
    { title: 'Club fair', category: 'Social', photo: '/images/campus/club-fair.jpg' },
    { title: 'Build sprint', category: 'Workshop', photo: '/images/campus/build-sprint.jpg' },
    { title: 'Fest finale', category: 'Cultural', photo: '/images/campus/fest-confetti.jpg' },
];

/** Campus life, in photos supplied by the site owner (public/images/campus). */
const COLLAGE = [
    { src: '/images/campus/fest-finale.jpg', caption: 'fest finale', speed: -0.18, cls: 'c1' },
    { src: '/images/campus/study-break.jpg', caption: 'study break', speed: 0.12, cls: 'c2' },
    { src: '/images/campus/club-fair.jpg', caption: 'club fair', speed: -0.32, cls: 'c3' },
    { src: '/images/campus/orientation-week.jpg', caption: 'orientation week', speed: 0.22, cls: 'c4' },
    { src: '/images/campus/cultural-night.jpg', caption: 'cultural night', speed: -0.1, cls: 'c5' },
    { src: '/images/campus/between-classes.jpg', caption: 'between classes', speed: 0.28, cls: 'c6' },
] as const;

/** Splits a sentence into word spans for the scroll-scrubbed reading. */
function Words({ text, strike }: { text: string; strike?: boolean }) {
    return (
        <span className={strike ? styles.struck : undefined}>
            {text.split(' ').map((w, i) => (
                <span key={i} className={styles.word} data-word>
                    {w}{' '}
                </span>
            ))}
            {strike && <span className={styles.strikeLine} data-strike aria-hidden="true" />}
        </span>
    );
}

/**
 * The landing page. A server component: the markup is all here and arrives
 * in the first paint; HomeMotion is the one client island that animates it,
 * finding what to move by data attributes.
 */
export default function Landing({ events, stats, categories, clubs, marquee, colleges }: LandingProps) {
    const deck = Array.from({ length: 5 }, (_, i) => {
        const e = events[i];
        if (e) {
            const d = istParts(e.date);
            return {
                key: e.id,
                href: `/events/${e.id}`,
                title: e.title,
                category: e.category || 'Event',
                image: resolveEventImage(e.category, e.thumbnail, e.title),
                when: `${d.weekday} ${d.day} ${d.month}`,
                price: priceLabel(e.price),
            };
        }
        const f = FALLBACK_DECK[i];
        return {
            key: `fallback-${i}`,
            href: '/events',
            title: f.title,
            category: f.category,
            image: f.photo,
            when: 'Soon',
            price: 'Free',
        };
    });
    const next = events[0];
    const nextParts = next ? istParts(next.date) : null;
    const week = events.slice(0, 8);
    const half = Math.ceil(marquee.length / 2);
    const rows = marquee.length >= 4 ? [marquee.slice(0, half), marquee.slice(half)] : [];

    return (
        <HomeMotion className={styles.page}>
            {/* Marks the page as animatable before the hero is parsed, so the
                hero can start hidden for its entrance instead of flashing in
                and then jumping. Skipped for reduced motion. */}
            <script
                dangerouslySetInnerHTML={{
                    __html: "if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('gsap-on')",
                }}
            />

            {/* ── Hero ───────────────────────────────────────────────── */}
            <section className={styles.hero} data-hero>
                <div className={styles.heroMeta} data-hero-fade>
                    <span className={styles.issue}>Campus Connect &mdash; the student noticeboard</span>
                    {stats.available && stats.events > 0 && (
                        <span className={styles.live}>
                            <span className={styles.liveDot} aria-hidden="true" />
                            {stats.events} events live across {stats.colleges} colleges
                        </span>
                    )}
                </div>

                <h1 className={styles.heroTitle}>
                    <span className={styles.lineMask}>
                        <span className={styles.line} data-hero-line>
                            Find what&rsquo;s on.
                        </span>
                    </span>
                    <span className={styles.lineMask}>
                        <span className={styles.line} data-hero-line>
                            Find <em className={styles.serif}>your people.</em>
                        </span>
                    </span>
                </h1>

                <div className={styles.heroFoot}>
                    <p className={styles.heroLede} data-hero-fade>
                        Fests, hackathons, workshops and clubs from every college on one board, plus
                        teammates for whatever you&rsquo;re building next.
                    </p>
                    <div className={styles.heroActions} data-hero-fade>
                        <Link href="/events" className={styles.btnPrimary} data-magnetic>
                            Explore events <ArrowRight size={17} aria-hidden="true" />
                        </Link>
                        <Link href="/signup" className={styles.btnGhost}>
                            Join free
                        </Link>
                    </div>
                    <div data-hero-fade>
                        <TryDemo variant="link" />
                    </div>
                    {next && nextParts && (
                        <Link href={`/events/${next.id}`} className={styles.nextUp} data-hero-fade>
                            <span className={styles.nextLabel}>Next up</span>
                            <span className={styles.nextTitle}>{next.title}</span>
                            <span className={styles.nextWhen}>
                                {nextParts.weekday} {nextParts.day} {nextParts.month} &middot; {nextParts.time}
                            </span>
                        </Link>
                    )}
                </div>

                {/* The deck: the next five events, dealt onto the table. */}
                <div className={styles.deck} data-deck aria-label="Upcoming events">
                    {deck.map((c, i) => (
                        <Link
                            key={c.key}
                            href={c.href}
                            className={`${styles.ticket} ${styles[`t${i}`]}`}
                            data-ticket
                            data-depth={[0.6, 1, 1.4, 0.9, 0.5][i]}
                            data-rot={[-8, -2.5, 3, -4, 7][i]}
                        >
                            <span className={styles.ticketPhoto}>
                                <Image
                                    src={c.image}
                                    alt=""
                                    fill
                                    sizes="(max-width: 700px) 46vw, 260px"
                                    priority={i < 3}
                                />
                            </span>
                            <span className={styles.ticketBody}>
                                <span className={styles.ticketCat}>
                                    <span
                                        className={styles.square}
                                        style={{ background: inkFor(c.category) }}
                                        aria-hidden="true"
                                    />
                                    {c.category}
                                </span>
                                <span className={styles.ticketTitle}>{c.title}</span>
                                <span className={styles.ticketFoot}>
                                    <span>{c.when}</span>
                                    <span className={styles.ticketPrice}>{c.price}</span>
                                </span>
                            </span>
                        </Link>
                    ))}
                </div>
            </section>

            {/* ── Running band ───────────────────────────────────────── */}
            {rows.length > 0 && (
                <div className={styles.band} aria-label="Upcoming events" role="marquee">
                    {rows.map((row, r) => (
                        <div key={r} className={`${styles.bandRow} ${r ? styles.bandRowAlt : ''}`}>
                            <div className={styles.bandTrack} data-band={r ? -1 : 1}>
                                {[0, 1].map((copy) => (
                                    <span key={copy} className={styles.bandRun} aria-hidden={copy ? true : undefined}>
                                        {row.map((t, i) => (
                                            <span key={i} className={styles.bandItem}>
                                                {t}
                                                <span className={styles.bandStar} aria-hidden="true">
                                                    ✳
                                                </span>
                                            </span>
                                        ))}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Why it exists: read along as you scroll ────────────── */}
            <section className={styles.manifesto} data-manifesto>
                <p className={styles.kicker}>Why this exists</p>
                <p className={styles.manifestoText}>
                    <Words text="Twelve WhatsApp groups." strike />{' '}
                    <Words text="A poster on the canteen wall." strike />{' '}
                    <Words text="Finding out the day after." strike />{' '}
                    <span className={styles.oneBoard} data-oneboard>
                        One <em className={styles.serif}>board.</em>
                    </span>
                </p>
                <p className={styles.manifestoNote} data-reveal>
                    Every event, club and team call from every college in one place, in the order it happens.
                </p>
            </section>

            {/* ── This week: a rail that moves sideways as you scroll ── */}
            {week.length > 0 && (
                <section className={styles.week} data-week>
                    <div className={styles.weekHead}>
                        <div>
                            <p className={styles.kicker}>On the board</p>
                            <h2 className={styles.h2}>
                                Coming up, <em className={styles.serif}>in order.</em>
                            </h2>
                        </div>
                        {categories.length > 0 && (
                            <nav className={styles.cats} aria-label="Browse by category">
                                {categories.slice(0, 6).map((c) => (
                                    <Link
                                        key={c.name}
                                        href={`/events?category=${encodeURIComponent(c.name)}`}
                                        className={styles.cat}
                                    >
                                        <span
                                            className={styles.square}
                                            style={{ background: inkFor(c.name) }}
                                            aria-hidden="true"
                                        />
                                        {c.name}
                                        <span className={styles.catCount}>{c.count}</span>
                                    </Link>
                                ))}
                            </nav>
                        )}
                    </div>
                    <div className={styles.railViewport} data-rail-viewport>
                        <div className={styles.rail} data-rail>
                            {week.map((e, i) => {
                                const d = istParts(e.date);
                                return (
                                    <Link key={e.id} href={`/events/${e.id}`} className={styles.railCard}>
                                        <span className={styles.railPhoto}>
                                            <Image
                                                src={resolveEventImage(e.category, e.thumbnail, e.title)}
                                                alt=""
                                                fill
                                                sizes="(max-width: 700px) 80vw, 380px"
                                            />
                                            <span className={styles.railDate}>
                                                <b>{d.day}</b>
                                                {d.month}
                                            </span>
                                            <span className={styles.railIndex}>{String(i + 1).padStart(2, '0')}</span>
                                        </span>
                                        <span className={styles.railBody}>
                                            <span className={styles.ticketCat}>
                                                <span
                                                    className={styles.square}
                                                    style={{ background: inkFor(e.category) }}
                                                    aria-hidden="true"
                                                />
                                                {e.category || 'Event'}
                                            </span>
                                            <span className={styles.railTitle}>{e.title}</span>
                                            <span className={styles.railMeta}>
                                                {d.weekday}, {d.time}
                                                {e.venue ? ` · ${e.venue}` : ''}
                                            </span>
                                            <span className={styles.railFoot}>
                                                <span className={styles.pricePill}>{priceLabel(e.price)}</span>
                                                {(e.registrationCount ?? 0) > 0 && (
                                                    <span>{e.registrationCount} going</span>
                                                )}
                                            </span>
                                        </span>
                                    </Link>
                                );
                            })}
                            <Link href="/events" className={styles.railMore}>
                                <span className={styles.railMoreTitle}>
                                    See every <em className={styles.serif}>event</em>
                                </span>
                                <ArrowUpRight size={36} aria-hidden="true" />
                            </Link>
                        </div>
                    </div>
                </section>
            )}

            {/* ── What you can do: four sheets that stack as you scroll ─ */}
            <section className={styles.features}>
                <div className={styles.featuresHead} data-reveal>
                    <p className={styles.kicker}>One board, four jobs</p>
                    <h2 className={styles.h2}>
                        Everything a semester throws at you, <em className={styles.serif}>handled.</em>
                    </h2>
                </div>

                <div className={styles.stack}>
                    <article className={`${styles.sheet} ${styles.sheetPaper}`} data-sheet>
                        <div className={styles.sheetText}>
                            <span className={styles.sheetNo}>01 &mdash; Events</span>
                            <h3 className={styles.sheetTitle}>Every event, in the order it happens.</h3>
                            <p className={styles.sheetBody}>
                                Filter by category or week, register in two taps, and pay for tickets in
                                rupees. No more finding out from a story that expired yesterday.
                            </p>
                            <Link href="/events" className={styles.sheetLink}>
                                Browse events <ArrowRight size={16} aria-hidden="true" />
                            </Link>
                        </div>
                        <div className={styles.sheetArt} aria-hidden="true">
                            <div className={styles.mockList}>
                                {(week.length ? week.slice(0, 4) : []).map((e) => {
                                    const d = istParts(e.date);
                                    return (
                                        <div key={e.id} className={styles.mockRow}>
                                            <span className={styles.mockDate}>
                                                <b>{d.day}</b>
                                                {d.month}
                                            </span>
                                            <span className={styles.mockName}>{e.title}</span>
                                            <span className={styles.mockDot} style={{ background: inkFor(e.category) }} />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </article>

                    <article className={`${styles.sheet} ${styles.sheetBlue}`} data-sheet>
                        <div className={styles.sheetText}>
                            <span className={styles.sheetNo}>02 &mdash; Team finder</span>
                            <h3 className={styles.sheetTitle}>Never hack alone.</h3>
                            <p className={styles.sheetBody}>
                                Say what you can do and what you need. We match people whose skills fill the
                                gaps, across every campus on the board.
                            </p>
                            <Link href="/team-finder" className={styles.sheetLink}>
                                Find a team <ArrowRight size={16} aria-hidden="true" />
                            </Link>
                        </div>
                        <div className={styles.sheetArt} aria-hidden="true">
                            <div className={styles.matchMock}>
                                <div className={styles.matchSide}>
                                    <span className={styles.skill}>Rust</span>
                                    <span className={styles.skill}>Backend</span>
                                </div>
                                <span className={styles.matchPlus}>+</span>
                                <div className={styles.matchSide}>
                                    <span className={styles.skill}>Figma</span>
                                    <span className={styles.skill}>ESP32</span>
                                </div>
                                <span className={styles.matchResult}>
                                    <Check size={16} /> Team of 4 &middot; 92% match
                                </span>
                            </div>
                        </div>
                    </article>

                    <article className={`${styles.sheet} ${styles.sheetMarker}`} data-sheet>
                        <div className={styles.sheetText}>
                            <span className={styles.sheetNo}>03 &mdash; Clubs &amp; Buzz</span>
                            <h3 className={styles.sheetTitle}>Clubs with a pulse.</h3>
                            <p className={styles.sheetBody}>
                                Join in one tap. Every club gets a feed, so you hear about build nights before
                                they happen, not after.
                            </p>
                            <Link href="/clubs" className={styles.sheetLink}>
                                Explore clubs <ArrowRight size={16} aria-hidden="true" />
                            </Link>
                        </div>
                        <div className={styles.sheetArt} aria-hidden="true">
                            <div className={styles.clubStack}>
                                {(clubs.length ? clubs.slice(0, 3) : []).map((c) => (
                                    <div key={c.id} className={styles.clubRow}>
                                        <span className={styles.clubMark} style={{ background: inkFor(c.category) }}>
                                            {c.name.charAt(0)}
                                        </span>
                                        <span className={styles.clubText}>
                                            <b>{c.name}</b>
                                            {c.members} members{c.college ? ` · ${c.college}` : ''}
                                        </span>
                                        <span className={styles.joinPill}>Join</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </article>

                    <article className={`${styles.sheet} ${styles.sheetInk}`} data-sheet>
                        <div className={styles.sheetText}>
                            <span className={styles.sheetNo}>04 &mdash; Leaderboards</span>
                            <h3 className={styles.sheetTitle}>Show up, rank up.</h3>
                            <p className={styles.sheetBody}>
                                Attend, host and earn badges. The most active students and clubs get the top of
                                the board, and the bragging rights.
                            </p>
                            <Link href="/leaderboards" className={styles.sheetLink}>
                                See the leaderboard <ArrowRight size={16} aria-hidden="true" />
                            </Link>
                        </div>
                        <div className={styles.sheetArt} aria-hidden="true">
                            <ol className={styles.ranks}>
                                {[
                                    ['Fatima S.', 'BITS Goa', 1240],
                                    ['Aditya R.', 'IIT Mumbai', 1185],
                                    ['Ishita B.', 'NID', 960],
                                ].map(([n, c, p], i) => (
                                    <li key={n as string} className={styles.rank}>
                                        <span className={styles.rankNo}>{i + 1}</span>
                                        <span className={styles.rankName}>
                                            <b>{n}</b>
                                            {c}
                                        </span>
                                        <span className={styles.rankPts}>{p} pts</span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </article>
                </div>
            </section>

            {/* ── Numbers ────────────────────────────────────────────── */}
            {stats.available && (
                <section className={styles.numbers} aria-label="Campus Connect in numbers">
                    {[
                        { value: stats.events, label: 'events coming up', mark: 'var(--press-technology)' },
                        { value: stats.clubs, label: 'active clubs', mark: 'var(--press-sports)' },
                        { value: stats.colleges, label: 'colleges', mark: 'var(--press-workshop)' },
                        { value: stats.students, label: 'students', mark: 'var(--press-cultural)' },
                    ].map((s) => (
                        <div key={s.label} className={styles.number} data-reveal>
                            <span className={styles.numberValue} data-count={s.value}>
                                {s.value}
                            </span>
                            <span className={styles.numberLabel}>
                                <span className={styles.square} style={{ background: s.mark }} aria-hidden="true" />
                                {s.label}
                            </span>
                        </div>
                    ))}
                </section>
            )}

            {/* ── Campus life collage ────────────────────────────────── */}
            <section className={styles.collage} aria-label="Photographs of campus life">
                <h2 className={styles.collageTitle} data-reveal>
                    This is what it&rsquo;s <em className={styles.serif}>for.</em>
                </h2>
                {COLLAGE.map((p) => (
                    <figure key={p.src} className={`${styles.photo} ${styles[p.cls]}`} data-speed={p.speed}>
                        <span className={styles.photoImg}>
                            <Image src={p.src} alt={p.caption} fill sizes="(max-width: 700px) 45vw, 300px" />
                        </span>
                        <figcaption>{p.caption}</figcaption>
                    </figure>
                ))}
            </section>

            {/* ── Colleges ───────────────────────────────────────────── */}
            {colleges.length > 0 && (
                <section className={styles.colleges}>
                    <div className={styles.collegesHead} data-reveal>
                        <div>
                            <p className={styles.kicker}>Campuses</p>
                            <h2 className={styles.h2}>
                                Colleges already <em className={styles.serif}>on the board.</em>
                            </h2>
                        </div>
                        <Link href="/colleges" className={styles.btnGhost}>
                            All colleges <ArrowRight size={16} aria-hidden="true" />
                        </Link>
                    </div>
                    <CollegeIndex colleges={colleges} />
                </section>
            )}

            {/* ── For organisers ─────────────────────────────────────── */}
            <section className={styles.organisers} data-reveal>
                <div className={styles.orgText}>
                    <p className={styles.orgKicker}>For clubs &amp; organisers</p>
                    <h2 className={styles.orgTitle}>
                        Run a club? Put your next event <em className={styles.serif}>on the board.</em>
                    </h2>
                    <ul className={styles.orgList}>
                        <li>Publish an event in a couple of minutes</li>
                        <li>Sell tickets in rupees, paid out through Stripe</li>
                        <li>Every listing checked by an admin before it goes live</li>
                        <li>A feed for your members, and a team finder for your hackathon</li>
                    </ul>
                    <div className={styles.orgActions}>
                        <Link href="/events/create" className={styles.btnMarker}>
                            Host an event <ArrowRight size={16} aria-hidden="true" />
                        </Link>
                        <Link href="/clubs/create" className={styles.btnOnBlue}>
                            Register a club
                        </Link>
                    </div>
                </div>
                <div className={styles.orgForm} aria-hidden="true">
                    <span className={styles.orgFormHead}>New event</span>
                    {[
                        ['Event', 'Build Night #4'],
                        ['When', 'Fri, 7:00 pm'],
                        ['Where', 'Seminar Room 3'],
                        ['Ticket', '₹99'],
                    ].map(([k, v]) => (
                        <span key={k} className={styles.orgRow} data-org-row>
                            <span>{k}</span>
                            <b>{v}</b>
                        </span>
                    ))}
                    <span className={styles.orgStatus} data-org-row>
                        <Check size={14} /> Sent for review
                    </span>
                </div>
            </section>

            {/* ── Close ──────────────────────────────────────────────── */}
            <section className={styles.close} data-close>
                <h2 className={styles.closeTitle} data-close-title>
                    Start with <em className={styles.serif}>this week.</em>
                </h2>
                <div className={styles.closeActions}>
                    <Link href="/signup" className={styles.btnPrimary} data-magnetic>
                        Create a free account <ArrowRight size={17} aria-hidden="true" />
                    </Link>
                    <Link href="/events" className={styles.btnGhost}>
                        Browse first
                    </Link>
                </div>
            </section>
        </HomeMotion>
    );
}
