'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Plus } from 'lucide-react';
import { inkFor } from '@/app/events/press';
import { resolveClubImage } from '@/lib/college-images';
import { useAuth } from '@/context/AuthContext';
import { getPostableClubs } from '@/lib/actions/buzz';
import styles from './clubs.module.css';
import entrance from '@/components/entrance.module.css';

interface Club {
    id: string;
    name: string;
    description: string;
    category: string;
    logo: string | null;
    collegeId: string;
    createdAt: string;
    updatedAt: string;
    college: { id: string; name: string };
    _count: { members: number; events?: number; posts?: number };
}

interface ClubListProps {
    initialClubs: Club[];
}

// Each card waits its turn; capped so a long list does not keep the last
// cards blank for seconds.
const stagger = (i: number) => ({ '--delay': `${Math.min(i, 12) * 0.05}s` }) as CSSProperties;

/* Clubs pick their category freely, so near-duplicates appear; each is
   filed under the name the events board uses. */
const CATEGORY_ALIASES: Record<string, string> = { Technical: 'Technology', Tech: 'Technology' };
const categoryOf = (c: string) => CATEGORY_ALIASES[c] ?? c;

export default function ClubList({ initialClubs }: ClubListProps) {
    const { user } = useAuth();
    const [category, setCategory] = useState('All');
    const [mineOnly, setMineOnly] = useState(false);

    // Your memberships are per person, so they are fetched here rather than
    // baked into the cached page.
    const [joinedClubIds, setJoinedClubIds] = useState<string[]>([]);
    useEffect(() => {
        if (!user) return;
        let alive = true;
        getPostableClubs().then((clubs) => {
            if (alive) setJoinedClubIds(clubs.map((c) => c.id));
        });
        return () => {
            alive = false;
        };
    }, [user]);

    /**
     * Filters are built from the clubs themselves and carry counts, so a
     * filter can never point at an empty result.
     */
    const categories = useMemo(() => {
        const counts = new Map<string, number>();
        for (const c of initialClubs) {
            const name = categoryOf(c.category);
            counts.set(name, (counts.get(name) ?? 0) + 1);
        }
        return [...counts.entries()].sort((a, b) => b[1] - a[1]);
    }, [initialClubs]);

    const visible = useMemo(
        () =>
            initialClubs
                .filter((c) => category === 'All' || categoryOf(c.category) === category)
                .filter((c) => !mineOnly || joinedClubIds.includes(c.id)),
        [initialClubs, category, mineOnly, joinedClubIds]
    );

    const collegeCount = useMemo(
        () => new Set(initialClubs.map((c) => c.college?.name).filter(Boolean)).size,
        [initialClubs]
    );

    return (
        <div className={styles.page}>
            <header className={styles.masthead}>
                <div>
                    <p className={styles.label}>Societies</p>
                    <h1 className={styles.title}>
                        Find the people <em className="accent">already doing it.</em>
                    </h1>
                </div>
                <span className={styles.count}>
                    {initialClubs.length} clubs · {collegeCount} colleges
                </span>
            </header>

            {/* Categories wrap onto a second line on wide screens and scroll
                sideways on a phone, with a fade to show there is more. Start
                a club stays pinned at the end either way. */}
            <nav className={styles.controls} aria-label="Filter clubs">
                <div className={styles.chips}>
                    <button
                        type="button"
                        className={styles.pill}
                        aria-pressed={category === 'All' && !mineOnly}
                        onClick={() => { setCategory('All'); setMineOnly(false); }}
                    >
                        All
                        <span className={styles.pillCount}>{initialClubs.length}</span>
                    </button>

                    {user && joinedClubIds.length > 0 && (
                        <>
                            <button
                                type="button"
                                className={styles.pill}
                                aria-pressed={mineOnly}
                                onClick={() => setMineOnly((v) => !v)}
                            >
                                Mine
                                <span className={styles.pillCount}>{joinedClubIds.length}</span>
                            </button>
                            <span className={styles.divider} aria-hidden="true" />
                        </>
                    )}

                    {categories.map(([name, n]) => (
                        <button
                            key={name}
                            type="button"
                            className={styles.pill}
                            aria-pressed={category === name}
                            onClick={() => setCategory(category === name ? 'All' : name)}
                        >
                            <i className={styles.swatch} style={{ background: inkFor(name) }} aria-hidden="true" />
                            {name}
                            <span className={styles.pillCount}>{n}</span>
                        </button>
                    ))}
                </div>

                <Link href="/clubs/create" className={styles.create} aria-label="Start a club">
                    <Plus size={16} aria-hidden="true" />
                    <span className={styles.createText}>Start a club</span>
                </Link>
            </nav>

            {visible.length === 0 ? (
                <div className={styles.empty}>
                    <h2 className={styles.emptyTitle}>
                        {mineOnly ? 'You haven’t joined anything yet.' : 'Nothing here yet.'}
                    </h2>
                    <p className={styles.emptyText}>
                        {mineOnly
                            ? 'Clubs you join will collect here, with their events and posts.'
                            : 'No clubs match that filter.'}
                    </p>
                    <button
                        type="button"
                        className={styles.create}
                        onClick={() => { setCategory('All'); setMineOnly(false); }}
                    >
                        Show every club
                    </button>
                </div>
            ) : (
                // Keyed on the filter so a new filter replays the entrance.
                <div className={styles.grid} key={`${category}-${mineOnly}`}>
                    {visible.map((club, i) => (
                        <div key={club.id} className={entrance.rise} style={stagger(i)}>
                            <ClubItem club={club} joined={joinedClubIds.includes(club.id)} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function ClubItem({ club, joined }: { club: Club; joined: boolean }) {
    const [src, setSrc] = useState(() => resolveClubImage(club));

    const members = club._count.members;
    const events = club._count.events ?? 0;

    return (
        <Link href={`/clubs/${club.id}`} className={styles.item}>
            <div className={styles.media}>
                <Image
                    src={src}
                    alt=""
                    fill
                    sizes="(max-width: 700px) 100vw, 520px"
                    onError={() =>
                        setSrc('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=800')
                    }
                />
            </div>

            <div className={styles.foot}>
                <h2 className={styles.name}>{club.name}</h2>
                <span className={styles.category}>{club.category}</span>
            </div>

            <p className={styles.meta}>
                {club.college?.name}
                <span className={styles.metaDivider}>/</span>
                {members} {members === 1 ? 'member' : 'members'}
                {events > 0 && (
                    <>
                        <span className={styles.metaDivider}>/</span>
                        {events} {events === 1 ? 'event' : 'events'}
                    </>
                )}
            </p>

            {joined && <span className={styles.joined}>Joined</span>}
        </Link>
    );
}
