'use client';

import { useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowUp, Heart, MessageCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createClubPost, getPostComments, createPostComment } from '@/lib/actions/clubs';
import type { BuzzPost } from '@/lib/actions/buzz';
import styles from './buzz.module.css';
import Reveal from '@/components/Reveal';

interface Props {
    posts: BuzzPost[];
    myClubs: { id: string; name: string }[];
}

interface Comment {
    id: string;
    content: string;
    // getPostComments returns Prisma's Date here, while the feed serialises its
    // own timestamps to ISO strings. Accept both rather than casting one away.
    timestamp: Date | string;
    author: { id: string; name: string; avatar?: string | null };
}

const MAX_POST = 1000;

export default function BuzzClient({ posts, myClubs }: Props) {
    const router = useRouter();
    const { user } = useAuth();
    const [isPending, startTransition] = useTransition();

    const [content, setContent] = useState('');
    const [clubId, setClubId] = useState(myClubs[0]?.id ?? '');
    const [activeTopic, setActiveTopic] = useState('All');

    const [openComments, setOpenComments] = useState<string | null>(null);
    const [comments, setComments] = useState<Record<string, Comment[]>>({});
    const [commentDraft, setCommentDraft] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);

    /* Topics come from the posts on screen, not from a separate query that
       counted clubs. A filter that says "Technology 5" now means five posts
       are behind it — which is what a reader assumes a number beside a filter
       means, and what the old club-count could not promise. */
    const topics = useMemo(() => {
        const counts = new Map<string, number>();
        for (const p of posts) {
            counts.set(p.club.category, (counts.get(p.club.category) ?? 0) + 1);
        }
        return [...counts.entries()]
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    }, [posts]);

    const visible =
        activeTopic === 'All' ? posts : posts.filter((p) => p.club.category === activeTopic);

    const handlePost = () => {
        if (!content.trim()) return;
        if (!clubId) {
            toast.error('Join a club before posting — posts belong to a club.');
            return;
        }

        startTransition(async () => {
            const result = await createClubPost(clubId, content.trim());
            if (result.success) {
                setContent('');
                toast.success('Posted');
                router.refresh(); // pull the real row back from the server
            } else {
                toast.error(result.error || 'Could not publish your post');
            }
        });
    };

    const toggleComments = async (postId: string) => {
        if (openComments === postId) {
            setOpenComments(null);
            return;
        }

        setOpenComments(postId);

        if (!comments[postId]) {
            setLoadingComments(true);
            const result = await getPostComments(postId);
            if (result.success && result.data) {
                setComments((c) => ({ ...c, [postId]: result.data as Comment[] }));
            }
            setLoadingComments(false);
        }
    };

    const handleComment = (postId: string) => {
        if (!commentDraft.trim()) return;

        startTransition(async () => {
            const result = await createPostComment(postId, commentDraft.trim());
            if (result.success) {
                setCommentDraft('');
                const refreshed = await getPostComments(postId);
                if (refreshed.success && refreshed.data) {
                    setComments((c) => ({ ...c, [postId]: refreshed.data as Comment[] }));
                }
                router.refresh();
            } else {
                toast.error(result.error || 'Could not add your comment');
            }
        });
    };

    return (
        <div className={styles.page}>
            <header className={styles.masthead}>
                <div>
                    <p className={styles.label}>Buzz</p>
                    <h1 className={styles.title}>What clubs are saying.</h1>
                </div>
                <p className={styles.note}>Newest first, across every verified club</p>
            </header>

            {/* ── Composer ── */}
            {user && myClubs.length > 0 ? (
                <div className={styles.composer}>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder={`What's happening, ${user.name?.split(' ')[0] ?? 'there'}?`}
                        rows={2}
                        maxLength={MAX_POST}
                        className={styles.field}
                        aria-label="Write a post"
                    />
                    <div className={styles.composerFoot}>
                        <label className={styles.destination}>
                            Posting to
                            <select
                                value={clubId}
                                onChange={(e) => setClubId(e.target.value)}
                                className={styles.select}
                            >
                                {myClubs.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <span className={styles.sendGroup}>
                            {/* Only worth showing once the limit is in sight. */}
                            {content.length > MAX_POST - 120 && (
                                <span className={styles.charCount}>
                                    {MAX_POST - content.length}
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={handlePost}
                                disabled={isPending || !content.trim()}
                                className={styles.send}
                            >
                                {isPending ? 'Posting' : 'Post'}
                            </button>
                        </span>
                    </div>
                </div>
            ) : (
                <div className={styles.gate}>
                    <p className={styles.gateText}>
                        {user ? (
                            <>
                                Posts belong to a club. <Link href="/clubs">Join one</Link> and
                                whatever you write lands both on its page and here.
                            </>
                        ) : (
                            <>
                                <Link href="/login?redirect=%2Fbuzz">Log in</Link> to join the
                                conversation. Reading needs no account.
                            </>
                        )}
                    </p>
                </div>
            )}

            {/* ── Topics ── */}
            {topics.length > 0 && (
                <div className={styles.topics}>
                    <button
                        type="button"
                        onClick={() => setActiveTopic('All')}
                        className={styles.topic}
                        aria-pressed={activeTopic === 'All'}
                    >
                        All
                        <span className={styles.topicCount}>{posts.length}</span>
                    </button>
                    {topics.map((t) => (
                        <button
                            key={t.name}
                            type="button"
                            onClick={() => setActiveTopic(t.name)}
                            className={styles.topic}
                            aria-pressed={activeTopic === t.name}
                        >
                            {t.name}
                            <span className={styles.topicCount}>{t.count}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* ── Feed ── */}
            {visible.length === 0 ? (
                <div className={styles.empty}>
                    <h2 className={styles.emptyTitle}>
                        {posts.length === 0 ? 'Nothing posted yet.' : `Nothing in ${activeTopic}.`}
                    </h2>
                    <p className={styles.emptyText}>
                        {posts.length === 0
                            ? 'The feed fills in as clubs start posting.'
                            : 'Try another topic, or read everything.'}
                    </p>
                </div>
            ) : (
                <div className={styles.feed}>
                    {visible.map((post, i) => (
                        <Reveal key={post.id} delay={Math.min(i, 6) * 0.05}>
                        <article className={styles.post}>
                            <span className={styles.avatar} aria-hidden="true">
                                {post.author.avatar ? (
                                    <Image src={post.author.avatar} alt="" fill sizes="40px" />
                                ) : (
                                    post.author.name.charAt(0).toUpperCase()
                                )}
                            </span>

                            <div>
                                {/* The club comes first: a post belongs to a club here,
                                    and the person who wrote it is the attribution. */}
                                <div className={styles.byline}>
                                    <Link href={`/clubs/${post.club.id}`} className={styles.club}>
                                        {post.club.name}
                                    </Link>
                                    <span className={styles.bylineDot}>/</span>
                                    <Link
                                        href={`/profile/${post.author.id}`}
                                        className={styles.author}
                                    >
                                        {post.author.name}
                                    </Link>
                                    <span className={styles.bylineDot}>/</span>
                                    <span className={styles.stamp}>{timeAgo(post.timestamp)}</span>
                                </div>

                                <p className={styles.body}>{post.content}</p>

                                {post.image && (
                                    <div className={styles.figure}>
                                        <Image
                                            src={post.image}
                                            alt=""
                                            fill
                                            sizes="(max-width: 760px) 100vw, 700px"
                                        />
                                    </div>
                                )}

                                <div className={styles.meta}>
                                    {/* Read-only, like the club feed: there is no per-user
                                        like record in the schema, so a toggle here could
                                        not tell who liked what and would be theatre. */}
                                    <span className={styles.metric}>
                                        <Heart size={13} aria-hidden="true" />
                                        {post.likes}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => toggleComments(post.id)}
                                        className={styles.commentToggle}
                                        aria-expanded={openComments === post.id}
                                    >
                                        <MessageCircle size={13} aria-hidden="true" />
                                        {post.commentCount}
                                    </button>
                                </div>

                                {openComments === post.id && (
                                    <div className={styles.thread}>
                                        {loadingComments && !comments[post.id] ? (
                                            <p className={styles.threadNote}>Loading</p>
                                        ) : (comments[post.id]?.length ?? 0) === 0 ? (
                                            <p className={styles.threadNote}>No replies yet</p>
                                        ) : (
                                            comments[post.id].map((c) => (
                                                <div key={c.id} className={styles.comment}>
                                                    <div className={styles.commentHead}>
                                                        <span className={styles.commentAuthor}>
                                                            {c.author.name}
                                                        </span>
                                                        <span className={styles.commentStamp}>
                                                            {timeAgo(c.timestamp)}
                                                        </span>
                                                    </div>
                                                    <p className={styles.commentBody}>
                                                        {c.content}
                                                    </p>
                                                </div>
                                            ))
                                        )}

                                        {user && (
                                            <div className={styles.reply}>
                                                <input
                                                    value={commentDraft}
                                                    onChange={(e) =>
                                                        setCommentDraft(e.target.value)
                                                    }
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter')
                                                            handleComment(post.id);
                                                    }}
                                                    placeholder="Write a reply"
                                                    maxLength={500}
                                                    className={styles.replyField}
                                                    aria-label="Write a reply"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleComment(post.id)}
                                                    disabled={isPending || !commentDraft.trim()}
                                                    className={styles.replySend}
                                                    aria-label="Send reply"
                                                >
                                                    <ArrowUp size={15} aria-hidden="true" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </article>
                        </Reveal>
                    ))}
                </div>
            )}
        </div>
    );
}

function timeAgo(value: Date | string): string {
    const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
