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
 * Photography for the hero board, from Unsplash (free licence). Served
 * through next/image, which is already allowed to fetch from this host.
 * Pictures of real students make the board read as a campus rather than a
 * diagram; the cards on top are the product, the photos are the life it
 * is for.
 */
const PHOTO = {
    hackathon: '1731160807880-daf859b64420',
    makers: '1631350397792-8e0c2de5b637',
    fest: '1622831877966-18a6c8731a01',
    friends: '1765572144519-1dc1e6e07bc9',
    bench: '1517486808906-6ca8b3f04846',
    study: '1686624386665-4cd01b96d0f6',
    ananya: '1618245472177-2a74ad3b994a',
    rohan: '1663576139896-f1e9b9537634',
    meera: '1764740146693-4955d02c98f9',
    kabir: '1604177091072-b7b677a077f6',
} as const;

function unsplash(id: string, w: number, h: number, faces = false) {
    return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70${faces ? '&crop=faces' : ''}`;
}

function Face({ id, size, ring }: { id: string; size: number; ring?: boolean }) {
    return (
        <span className={`${styles.face} ${ring ? styles.faceRing : ''}`} style={{ width: size, height: size }}>
            <Image src={unsplash(id, size * 2, size * 2, true)} alt="" fill sizes={`${size}px`} />
        </span>
    );
}

function Polaroid({
    id,
    caption,
    className,
    tape = 'var(--color-marker)',
}: {
    id: string;
    caption: string;
    className: string;
    tape?: string;
}) {
    return (
        <figure className={`${styles.polaroid} ${className}`}>
            <span className={styles.tape} style={{ background: tape }} />
            <span className={styles.polaroidPhoto}>
                <Image src={unsplash(id, 360, 300)} alt="" fill sizes="180px" />
            </span>
            <figcaption>{caption}</figcaption>
        </figure>
    );
}

/**
 * The hero picture: a pinboard. The product's four moves are drawn as
 * cards wired together (an event leads to a team, a team to a chat, a club
 * hosts the event) with photos of campus life pinned around them. It uses
 * the real next event and the real busiest club when there are any, and a
 * plain example of each when there are not.
 */
function ConnectCanvas({ next, club }: { next?: EventWithRelations; club?: FeaturedClub }) {
    const d = next ? istParts(next.date) : null;
    const cover = next?.thumbnail || unsplash(PHOTO.hackathon, 640, 300);
    const going = next?.registrationCount ?? 0;
    const clubName = club?.name ?? 'Robotics Club';

    return (
        <div
            className={`${styles.canvasFrame} ${styles.enter}`}
            style={{ animationDelay: '260ms' }}
            role="img"
            aria-label="Preview of Campus Connect: an event you register for, a teammate match, your club's feed and a team chat, all connected, pinned to a board of campus photos."
        >
            <div className={styles.canvas} aria-hidden="true">
                {/* Pinned photos sit under the cards. */}
                <Polaroid id={PHOTO.fest} caption="fest night ✦" className={styles.polA} tape="#ffb3c8" />
                <Polaroid id={PHOTO.friends} caption="first-years meetup" className={styles.polB} />
                <Polaroid id={PHOTO.study} caption="hack week, day 2" className={styles.polC} tape="#b9c2ff" />

                <div className={styles.sticky}>
                    <span className={styles.pin} />
                    Free pizza at the 2 am check-in 🍕
                </div>

                <svg className={styles.wires} viewBox="0 0 1000 540" preserveAspectRatio="none">
                    <path d="M318 170 C 390 170, 370 110, 440 110" />
                    <path d="M318 300 C 390 300, 370 400, 440 400" />
                    <path d="M705 110 C 750 110, 735 270, 772 270" />
                </svg>
                <span className={styles.wireTag} style={{ left: '37.9%', top: '25.5%' }}>find a team</span>
                <span className={styles.wireTag} style={{ left: '37.9%', top: '65%' }}>hosted by</span>
                <span className={styles.wireTag} style={{ left: '73.8%', top: '35%' }}>say hi</span>

                {/* Event */}
                <div className={`${styles.node} ${styles.nodeEvent}`}>
                    <div className={styles.nodeCover}>
                        <Image src={cover} alt="" fill sizes="(max-width: 900px) 50vw, 320px" />
                        <span className={styles.coverDate}>
                            <b>{d?.day ?? '14'}</b>
                            <i>{d?.month ?? 'Dec'}</i>
                        </span>
                        <span className={styles.coverCat}>
                            <span className={styles.square} style={{ background: inkFor(next?.category ?? 'Hackathon') }} />
                            {next?.category ?? 'Hackathon'}
                        </span>
                    </div>
                    <div className={styles.nodeBody}>
                        <p className={styles.nodeTitle}>{next?.title ?? '36-hour campus hackathon'}</p>
                        <p className={styles.nodeMeta}>
                            <CalendarDays size={13} /> {d ? `${d.weekday}, ${d.time}` : 'Sat, 9:00 am'}
                            <span className={styles.metaDot} />
                            <MapPin size={13} /> {next?.venue ?? 'Main auditorium'}
                        </p>
                        <div className={styles.nodeFoot}>
                            <span className={styles.faces}>
                                <Face id={PHOTO.ananya} size={26} ring />
                                <Face id={PHOTO.rohan} size={26} ring />
                                <Face id={PHOTO.meera} size={26} ring />
                                <span className={styles.goingText}>
                                    {going > 0 ? `${going} going` : '+128 going'}
                                </span>
                            </span>
                            <span className={styles.nodeBtn}>{next ? priceLabel(next.price) : 'Free'} · Join</span>
                        </div>
                    </div>
                </div>

                {/* Team match */}
                <div className={`${styles.node} ${styles.nodeMatch}`}>
                    <p className={styles.nodeEyebrow}>
                        <span className={styles.liveDotSm} /> Teammate found
                    </p>
                    <div className={styles.matchRow}>
                        <Face id={PHOTO.ananya} size={40} />
                        <div>
                            <p className={styles.nodeTitleSm}>Ananya, 3rd year CSE</p>
                            <p className={styles.nodeMetaSm}>Needs a backend dev for the hackathon</p>
                        </div>
                    </div>
                    <div className={styles.chipRow}>
                        <span className={`${styles.skillSm} ${styles.skillHot}`}>Figma</span>
                        <span className={`${styles.skillSm} ${styles.skillHot}`}>UI design</span>
                        <span className={styles.skillSm}>+ you: Node</span>
                    </div>
                    <div className={styles.matchBar}>
                        <span style={{ width: '88%' }} />
                    </div>
                    <p className={styles.nodeMetaSm}>88% skill fit</p>
                </div>

                {/* Chat */}
                <div className={`${styles.node} ${styles.nodeChat}`}>
                    <p className={styles.nodeEyebrow}>Team chat · 4</p>
                    <div className={styles.chatLine}>
                        <Face id={PHOTO.rohan} size={24} />
                        <p className={styles.bubble}>we&rsquo;re in! meet at 9?</p>
                    </div>
                    <div className={styles.chatLine}>
                        <Face id={PHOTO.meera} size={24} />
                        <p className={styles.bubble}>I&rsquo;ll book a table 🙌</p>
                    </div>
                    <p className={`${styles.bubble} ${styles.bubbleMine}`}>bringing chargers ⚡</p>
                </div>

                {/* Club */}
                <div className={`${styles.node} ${styles.nodeClub}`}>
                    <div className={styles.clubCover}>
                        <Image src={unsplash(PHOTO.makers, 560, 200)} alt="" fill sizes="(max-width: 900px) 50vw, 300px" />
                    </div>
                    <div className={styles.clubRow}>
                        <span className={styles.clubLogoSm}>
                            {club?.logo ? (
                                <Image src={club.logo} alt="" fill sizes="36px" style={{ objectFit: 'cover' }} />
                            ) : (
                                clubName.charAt(0)
                            )}
                        </span>
                        <div className={styles.clubRowText}>
                            <p className={styles.nodeTitleSm}>{clubName}</p>
                            <p className={styles.nodeMetaSm}>
                                {club ? `${club.members} ${club.members === 1 ? 'member' : 'members'}` : '214 members'}
                            </p>
                        </div>
                        <span className={styles.joinedPill}>
                            <Check size={12} /> Joined
                        </span>
                    </div>
                </div>

                <span className={styles.stamp}>🔥 42 joined today</span>
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
