import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, CalendarDays, MapPin, Check } from 'lucide-react';
import type { EventWithRelations } from '@/lib/actions';
import type { LandingStats, CategoryBandItem, FeaturedClub } from '@/lib/actions/landing';
import { inkFor } from './events/press';
import Marquee, { type MarqueeItem } from '@/components/Marquee';
import AnimatedCounter from '@/components/ui/AnimatedCounter';
import Reveal from '@/components/Reveal';
import styles from './landing.module.css';

interface LandingProps {
    initialEvents: EventWithRelations[];
    stats: LandingStats;
    categories: CategoryBandItem[];
    clubs: FeaturedClub[];
    /** Rows for the running band. Real events, or nothing. */
    marquee: MarqueeItem[];
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

function priceLabel(price: number) {
    return price > 0 ? `₹${price.toLocaleString('en-IN')}` : 'Free';
}

/**
 * The landing page. A server component: nothing on it needs the browser
 * except the counters, the running band and the scroll reveals, which are
 * their own small client islands.
 */
export default function Landing({ initialEvents, stats, categories, clubs, marquee }: LandingProps) {
    const next = initialEvents[0];
    const topClub = clubs[0];

    return (
        <div className={styles.page}>
            {/* ── Hero ─────────────────────────────────────────────────
                Says what the site is in one line, then shows it. The
                entrance is CSS so the headline is in the first paint,
                not waiting on JavaScript. */}
            <section className={styles.hero}>
                <div className={styles.heroGrid} aria-hidden="true" />
                <div className={styles.heroInner}>
                    {stats.available && stats.events > 0 && (
                        <p className={`${styles.liveChip} ${styles.enter}`}>
                            <span className={styles.liveDot} aria-hidden="true" />
                            {stats.events} {stats.events === 1 ? 'event' : 'events'} on the board across{' '}
                            {stats.colleges} {stats.colleges === 1 ? 'college' : 'colleges'}
                        </p>
                    )}

                    <h1 className={`${styles.heroTitle} ${styles.enter}`} style={{ animationDelay: '60ms' }}>
                        Find what&rsquo;s on.
                        <br />
                        <mark>Find your people.</mark>
                    </h1>

                    <p className={`${styles.heroLede} ${styles.enter}`} style={{ animationDelay: '120ms' }}>
                        Fests, hackathons, workshops and clubs from every college on one board,
                        plus teammates for whatever you&rsquo;re building next.
                    </p>

                    <div className={`${styles.heroActions} ${styles.enter}`} style={{ animationDelay: '180ms' }}>
                        <Link href="/events" className="btn btn-primary">
                            Explore events
                            <ArrowRight size={16} aria-hidden="true" />
                        </Link>
                        <Link href="/signup" className="btn btn-outline">
                            Join free
                        </Link>
                    </div>
                    <p className={`${styles.heroFine} ${styles.enter}`} style={{ animationDelay: '220ms' }}>
                        Free for students &middot; Works in your browser
                    </p>
                </div>

                <ConnectCanvas next={next} club={topClub} />
            </section>

            <Marquee items={marquee} duration={60} tone="paper" label="Upcoming events" />

            {/* ── Stats ─────────────────────────────────────────────────
                Hidden outright when the counts could not be taken. A row
                of zeros reads as a real measurement of an empty site. */}
            {stats.available && (
                <section className={styles.section}>
                    <Reveal>
                        <dl className={styles.stats}>
                            {[
                                { value: stats.events, label: 'Upcoming events', mark: 'var(--press-technology)' },
                                { value: stats.clubs, label: 'Active clubs', mark: 'var(--press-sports)' },
                                { value: stats.colleges, label: 'Colleges', mark: 'var(--press-workshop)' },
                                { value: stats.students, label: 'Students', mark: 'var(--press-cultural)' },
                            ].map((s, i) => (
                                <div key={s.label} className={styles.stat}>
                                    <dt className={styles.statLabel}>
                                        <span className={styles.square} style={{ background: s.mark }} aria-hidden="true" />
                                        {s.label}
                                    </dt>
                                    <dd>
                                        <AnimatedCounter
                                            to={s.value}
                                            duration={1.2}
                                            delay={0.1 + i * 0.08}
                                            className={styles.statValue}
                                        />
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </Reveal>
                </section>
            )}

            {/* ── What you can do ──────────────────────────────────────
                A hairline bento. Each tile shows a sliver of the actual
                screen it links to, so the promise and the product are the
                same picture. */}
            <section className={styles.section}>
                <Reveal>
                    <SectionHead
                        label="One board"
                        title={<>Four things, <mark>done properly.</mark></>}
                        body="Everything a semester throws at you, without a group chat per club."
                    />
                </Reveal>

                <Reveal>
                    <div className={styles.bento}>
                        <Tile
                            href="/events"
                            label="Events"
                            mark="var(--press-technology)"
                            title="Every event, in the order it happens."
                            body="Filter by category or week, register in two taps, pay for tickets in rupees."
                            cta="Browse events"
                        >
                            <MiniAgenda events={initialEvents} />
                        </Tile>

                        <Tile
                            href="/team-finder"
                            label="Team finder"
                            mark="var(--press-hackathon)"
                            title="Never hack alone."
                            body="Say what you can do and what you need. We match people whose skills fill the gaps."
                            cta="Find a team"
                        >
                            <MiniMatch />
                        </Tile>

                        <Tile
                            href="/clubs"
                            label="Clubs & Buzz"
                            mark="var(--press-sports)"
                            title="Clubs with a pulse."
                            body="Join in one tap. Every club gets a feed, so you hear about build nights before they happen."
                            cta="Browse clubs"
                        >
                            <MiniPost club={topClub} />
                        </Tile>

                        <Tile
                            href="/leaderboards"
                            label="Leaderboard"
                            mark="var(--press-workshop)"
                            title="Show up, rank up."
                            body="Attend, host and win badges. The most active students and clubs get the top of the board."
                            cta="See the board"
                        >
                            <MiniBoard />
                        </Tile>
                    </div>
                </Reveal>
            </section>

            {/* ── Coming up ─────────────────────────────────────────── */}
            {initialEvents.length > 0 && (
                <section className={styles.section}>
                    <Reveal>
                        <SectionHead
                            label="Coming up"
                            title="The next things happening."
                            link={{ href: '/events', label: 'All events' }}
                        />
                    </Reveal>
                    <div className={styles.eventGrid}>
                        {initialEvents.map((e, i) => {
                            const d = istParts(e.date);
                            return (
                                <Reveal key={e.id} delay={i * 0.06}>
                                    <Link href={`/events/${e.id}`} className={styles.eventCard}>
                                        <div className={styles.eventMedia}>
                                            {e.thumbnail ? (
                                                <Image
                                                    src={e.thumbnail}
                                                    alt=""
                                                    fill
                                                    sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
                                                />
                                            ) : (
                                                <span className={styles.eventStub} style={{ background: inkFor(e.category) }} aria-hidden="true" />
                                            )}
                                            <span className={styles.dateTab}>
                                                <b>{d.day}</b>
                                                <i>{d.month}</i>
                                            </span>
                                        </div>
                                        <div className={styles.eventBody}>
                                            <span className={styles.catLabel}>
                                                <span className={styles.square} style={{ background: inkFor(e.category) }} aria-hidden="true" />
                                                {e.category}
                                            </span>
                                            <h3 className={styles.eventTitle}>{e.title}</h3>
                                            <span className={styles.eventMeta}>
                                                {d.weekday}, {d.time}
                                                {e.venue ? ` · ${e.venue}` : ''}
                                            </span>
                                            <span className={styles.eventFoot}>
                                                <span className={styles.price}>{priceLabel(e.price)}</span>
                                                {e.registrationCount > 0 && (
                                                    <span className={styles.going}>{e.registrationCount} going</span>
                                                )}
                                            </span>
                                        </div>
                                    </Link>
                                </Reveal>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* ── Categories ─────────────────────────────────────────── */}
            {categories.length > 0 && (
                <section className={styles.section}>
                    <Reveal>
                        <SectionHead label="Index" title="Browse by what you're into." />
                        <div className={styles.catChips}>
                            {categories.map((c) => (
                                <Link
                                    key={c.name}
                                    href={`/events?category=${encodeURIComponent(c.name)}`}
                                    className={styles.catChip}
                                >
                                    <span className={styles.square} style={{ background: inkFor(c.name) }} aria-hidden="true" />
                                    {c.name}
                                    <span className={styles.catCount}>{c.count}</span>
                                </Link>
                            ))}
                        </div>
                    </Reveal>
                </section>
            )}

            {/* ── Clubs ──────────────────────────────────────────────── */}
            {clubs.length > 0 && (
                <section className={styles.section}>
                    <Reveal>
                        <SectionHead
                            label="Most active"
                            title="Clubs worth joining."
                            link={{ href: '/clubs', label: 'All clubs' }}
                        />
                    </Reveal>
                    <div className={styles.clubGrid}>
                        {clubs.map((c, i) => (
                            <Reveal key={c.id} delay={i * 0.04}>
                                <Link href={`/clubs/${c.id}`} className={styles.clubCard}>
                                    <span className={styles.clubLogo}>
                                        {c.logo ? (
                                            <Image src={c.logo} alt="" fill sizes="48px" style={{ objectFit: 'cover' }} />
                                        ) : (
                                            c.name.charAt(0).toUpperCase()
                                        )}
                                    </span>
                                    <span className={styles.clubText}>
                                        <span className={styles.clubName}>{c.name}</span>
                                        <span className={styles.clubMeta}>
                                            {c.college ? `${c.college} · ` : ''}
                                            {c.members} {c.members === 1 ? 'member' : 'members'}
                                        </span>
                                    </span>
                                    <ArrowUpRight size={18} className={styles.clubArrow} aria-hidden="true" />
                                </Link>
                            </Reveal>
                        ))}
                    </div>
                </section>
            )}

            {/* ── For organisers ───────────────────────────────────────
                The other half of the board: the people who pin things to
                it. Electric ground so it reads as a different audience. */}
            <section className={styles.section}>
                <Reveal>
                    <div className={styles.organisers}>
                        <div className={styles.organisersText}>
                            <p className={styles.organisersLabel}>For clubs &amp; organisers</p>
                            <h2 className={styles.organisersTitle}>Run a club? Put your next event on the board.</h2>
                            <ul className={styles.organisersList}>
                                <li><Check size={16} aria-hidden="true" /> Publish an event in a couple of minutes</li>
                                <li><Check size={16} aria-hidden="true" /> Sell tickets in rupees, paid out through Stripe</li>
                                <li><Check size={16} aria-hidden="true" /> Every listing checked by an admin before it goes live</li>
                                <li><Check size={16} aria-hidden="true" /> A feed for your members, and a team finder for your hackathon</li>
                            </ul>
                            <div className={styles.organisersActions}>
                                <Link href="/events/create" className={styles.markerBtn}>
                                    Host an event
                                    <ArrowRight size={16} aria-hidden="true" />
                                </Link>
                                <Link href="/clubs/create" className={styles.ghostOnBlue}>
                                    Register a club
                                </Link>
                            </div>
                        </div>
                        <div className={styles.organisersCard} aria-hidden="true">
                            <div className={styles.formRow}>
                                <span className={styles.formLabel}>Event</span>
                                <span className={styles.formValue}>Build Night #4</span>
                            </div>
                            <div className={styles.formRow}>
                                <span className={styles.formLabel}>When</span>
                                <span className={styles.formValue}>Fri, 7:00 pm</span>
                            </div>
                            <div className={styles.formRow}>
                                <span className={styles.formLabel}>Ticket</span>
                                <span className={styles.formValue}>₹99</span>
                            </div>
                            <div className={styles.formStatus}>
                                <span className={styles.statusDot} />
                                Sent for review
                            </div>
                        </div>
                    </div>
                </Reveal>
            </section>

            {/* ── Close ──────────────────────────────────────────────── */}
            <section className={`${styles.section} ${styles.close}`}>
                <Reveal>
                    <h2 className={styles.closeTitle}>
                        Start with <mark>this week.</mark>
                    </h2>
                    <div className={styles.heroActions}>
                        <Link href="/signup" className="btn btn-primary">
                            Create a free account
                            <ArrowRight size={16} aria-hidden="true" />
                        </Link>
                        <Link href="/events" className="btn btn-outline">
                            Browse first
                        </Link>
                    </div>
                </Reveal>
            </section>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   Pieces
   ───────────────────────────────────────────────────────────── */

function SectionHead({
    label,
    title,
    body,
    link,
}: {
    label: string;
    title: React.ReactNode;
    body?: string;
    link?: { href: string; label: string };
}) {
    return (
        <div className={styles.sectionHead}>
            <div>
                <p className="mono-label">{label}</p>
                <h2 className={styles.sectionTitle}>{title}</h2>
                {body && <p className={styles.sectionBody}>{body}</p>}
            </div>
            {link && (
                <Link href={link.href} className={styles.sectionLink}>
                    {link.label}
                    <ArrowRight size={15} aria-hidden="true" />
                </Link>
            )}
        </div>
    );
}

function Tile({
    href,
    label,
    mark,
    title,
    body,
    cta,
    children,
}: {
    href: string;
    label: string;
    mark: string;
    title: string;
    body: string;
    cta: string;
    children: React.ReactNode;
}) {
    return (
        <Link href={href} className={styles.tile}>
            <span className={styles.tileLabel}>
                <span className={styles.square} style={{ background: mark }} aria-hidden="true" />
                {label}
            </span>
            <h3 className={styles.tileTitle}>{title}</h3>
            <p className={styles.tileBody}>{body}</p>
            <div className={styles.tileVisual} aria-hidden="true">
                {children}
            </div>
            <span className={styles.tileCta}>
                {cta}
                <ArrowRight size={15} aria-hidden="true" />
            </span>
        </Link>
    );
}

/**
 * The hero picture: the product's four moves, drawn as cards wired
 * together. An event leads to a team, a team to a chat, a club to the
 * next event. It uses the real next event and the real busiest club when
 * there are any, and a plain example of each when there are not.
 */
function ConnectCanvas({ next, club }: { next?: EventWithRelations; club?: FeaturedClub }) {
    const d = next ? istParts(next.date) : null;

    return (
        <div
            className={`${styles.canvasFrame} ${styles.enter}`}
            style={{ animationDelay: '260ms' }}
            role="img"
            aria-label="Preview of Campus Connect: an event you register for, a teammate match, your club's feed and a team chat, all connected."
        >
            <div className={styles.canvas} aria-hidden="true">
                <svg className={styles.wires} viewBox="0 0 1000 420" preserveAspectRatio="none">
                    <path d="M300 140 C 390 140, 380 95, 465 95" />
                    <path d="M300 220 C 390 220, 380 310, 465 310" />
                    <path d="M705 105 C 755 105, 745 200, 790 200" />
                </svg>
                <span className={styles.wireTag} style={{ left: '38.2%', top: '28.5%' }}>find a team</span>
                <span className={styles.wireTag} style={{ left: '38.2%', top: '63%' }}>hosted by</span>
                <span className={styles.wireTag} style={{ left: '74.8%', top: '36%' }}>say hi</span>

                {/* Event */}
                <div className={`${styles.node} ${styles.nodeEvent}`}>
                    <span className={styles.catLabel}>
                        <span className={styles.square} style={{ background: inkFor(next?.category ?? 'Hackathon') }} />
                        {next?.category ?? 'Hackathon'}
                    </span>
                    <p className={styles.nodeTitle}>{next?.title ?? '36-hour campus hackathon'}</p>
                    <p className={styles.nodeMeta}>
                        <CalendarDays size={13} /> {d ? `${d.weekday} ${d.day} ${d.month}, ${d.time}` : 'Sat 14 Dec, 9:00 am'}
                    </p>
                    <p className={styles.nodeMeta}>
                        <MapPin size={13} /> {next?.venue ?? 'Main auditorium'}
                    </p>
                    <div className={styles.nodeFoot}>
                        <span className={styles.price}>{next ? priceLabel(next.price) : 'Free'}</span>
                        <span className={styles.nodeBtn}>Register</span>
                    </div>
                </div>

                {/* Team match */}
                <div className={`${styles.node} ${styles.nodeMatch}`}>
                    <p className={styles.nodeEyebrow}>Teammate found</p>
                    <div className={styles.matchRow}>
                        <span className={styles.avatar} style={{ background: '#ffd2e1' }}>A</span>
                        <div>
                            <p className={styles.nodeTitleSm}>Can do: UI design, Figma</p>
                            <p className={styles.nodeMetaSm}>Needs: backend, ML</p>
                        </div>
                    </div>
                    <div className={styles.matchBar}>
                        <span style={{ width: '88%' }} />
                    </div>
                    <p className={styles.nodeMetaSm}>88% skill fit</p>
                </div>

                {/* Chat */}
                <div className={`${styles.node} ${styles.nodeChat}`}>
                    <p className={styles.nodeEyebrow}>Team chat</p>
                    <p className={styles.bubble}>we&rsquo;re in! meet at 9?</p>
                    <p className={`${styles.bubble} ${styles.bubbleMine}`}>bringing chargers ⚡</p>
                </div>

                {/* Club */}
                <div className={`${styles.node} ${styles.nodeClub}`}>
                    <div className={styles.matchRow}>
                        <span className={styles.clubLogoSm}>{(club?.name ?? 'Robotics Club').charAt(0)}</span>
                        <div>
                            <p className={styles.nodeTitleSm}>{club?.name ?? 'Robotics Club'}</p>
                            <p className={styles.nodeMetaSm}>
                                {club ? `${club.members} ${club.members === 1 ? 'member' : 'members'}` : '214 members'}
                            </p>
                        </div>
                    </div>
                    <span className={styles.joinedPill}>
                        <Check size={12} /> Joined
                    </span>
                </div>
            </div>
        </div>
    );
}

function MiniAgenda({ events }: { events: EventWithRelations[] }) {
    const rows = events.length
        ? events.slice(0, 3).map((e) => ({ id: e.id, title: e.title, category: e.category, ...istParts(e.date) }))
        : [
              { id: 'a', title: 'Intro to Rust workshop', category: 'Workshop', day: '12', month: 'Dec', weekday: 'Thu', time: '' },
              { id: 'b', title: 'Inter-college football', category: 'Sports', day: '14', month: 'Dec', weekday: 'Sat', time: '' },
              { id: 'c', title: 'Winter cultural night', category: 'Cultural', day: '19', month: 'Dec', weekday: 'Thu', time: '' },
          ];
    return (
        <div className={styles.miniList}>
            {rows.map((r) => (
                <div key={r.id} className={styles.miniRow}>
                    <span className={styles.miniDate}>
                        <b>{r.day}</b>
                        {r.month}
                    </span>
                    <span className={styles.miniTitle}>{r.title}</span>
                    <span className={styles.square} style={{ background: inkFor(r.category) }} />
                </div>
            ))}
        </div>
    );
}

function MiniMatch() {
    return (
        <div className={styles.miniMatch}>
            <div className={styles.skillCol}>
                <span className={styles.skill}>React</span>
                <span className={styles.skill}>Node</span>
            </div>
            <span className={styles.plus}>+</span>
            <div className={styles.skillCol}>
                <span className={`${styles.skill} ${styles.skillHot}`}>Figma</span>
                <span className={`${styles.skill} ${styles.skillHot}`}>PyTorch</span>
            </div>
            <span className={styles.plus}>=</span>
            <span className={styles.teamBadge}>Team of 4</span>
        </div>
    );
}

function MiniPost({ club }: { club?: FeaturedClub }) {
    const name = club?.name ?? 'Robotics Club';
    return (
        <div className={styles.miniPost}>
            <div className={styles.matchRow}>
                <span className={styles.clubLogoSm}>{name.charAt(0)}</span>
                <div>
                    <p className={styles.nodeTitleSm}>{name}</p>
                    <p className={styles.nodeMetaSm}>posted to the feed</p>
                </div>
            </div>
            <p className={styles.miniPostText}>Build night this Friday. Bring a half-finished project.</p>
            <div className={styles.reactions}>
                <span>🔥 24</span>
                <span>💬 6</span>
            </div>
        </div>
    );
}

function MiniBoard() {
    const rows = [
        { n: 1, w: 92 },
        { n: 2, w: 74 },
        { n: 3, w: 61 },
    ];
    return (
        <div className={styles.miniList}>
            {rows.map((r) => (
                <div key={r.n} className={styles.boardRow}>
                    <span className={styles.boardRank}>{String(r.n).padStart(2, '0')}</span>
                    <span className={styles.boardBar}>
                        <span style={{ width: `${r.w}%` }} />
                    </span>
                </div>
            ))}
        </div>
    );
}
