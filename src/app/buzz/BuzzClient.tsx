'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MessageCircle, Heart, Send, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createClubPost, getPostComments, createPostComment } from '@/lib/actions/clubs';
import type { BuzzPost } from '@/lib/actions/buzz';

interface Props {
    posts: BuzzPost[];
    topics: { name: string; count: number }[];
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

export default function BuzzClient({ posts, topics, myClubs }: Props) {
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
        <div className="mx-auto max-w-3xl px-4 py-8">
            <header className="mb-6">
                <h1 className="text-3xl font-bold text-[var(--text-primary)]">Campus Buzz</h1>
                <p className="mt-1 text-[15px] text-[var(--text-secondary)]">
                    What clubs across campus are posting right now.
                </p>
            </header>

            {/* ── Composer ── */}
            {user ? (
                myClubs.length > 0 ? (
                    <div className="mb-8 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-color)] p-4">
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder={`What's happening, ${user.name?.split(' ')[0] ?? 'there'}?`}
                            rows={3}
                            maxLength={1000}
                            className="w-full resize-none bg-transparent text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
                        />
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-color)] pt-3">
                            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                Posting to
                                <select
                                    value={clubId}
                                    onChange={(e) => setClubId(e.target.value)}
                                    className="rounded-lg border border-[var(--border-color)] bg-[var(--background-color)] px-2 py-1 text-sm text-[var(--text-primary)]"
                                >
                                    {myClubs.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </label>
                            <button
                                onClick={handlePost}
                                disabled={isPending || !content.trim()}
                                className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-forest)] px-4 py-2 text-sm font-semibold text-[var(--color-cream)] transition hover:opacity-90 disabled:opacity-40"
                            >
                                <Send size={15} />
                                {isPending ? 'Posting…' : 'Post'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="mb-8 rounded-2xl border border-dashed border-[var(--border-color)] p-5 text-center">
                        <Users size={20} className="mx-auto mb-2 text-[var(--text-secondary)]" />
                        <p className="text-sm text-[var(--text-secondary)]">
                            Posts belong to a club.{' '}
                            <Link href="/clubs" className="font-semibold underline">
                                Join a club
                            </Link>{' '}
                            to start posting.
                        </p>
                    </div>
                )
            ) : (
                <div className="mb-8 rounded-2xl border border-dashed border-[var(--border-color)] p-5 text-center">
                    <p className="text-sm text-[var(--text-secondary)]">
                        <Link href="/login?redirect=%2Fbuzz" className="font-semibold underline">
                            Log in
                        </Link>{' '}
                        to join the conversation.
                    </p>
                </div>
            )}

            {/* ── Topic filter, from real club categories ── */}
            {topics.length > 0 && (
                <div className="mb-6 flex flex-wrap gap-2">
                    {['All', ...topics.map((t) => t.name)].map((t) => (
                        <button
                            key={t}
                            onClick={() => setActiveTopic(t)}
                            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                                activeTopic === t
                                    ? 'border-[var(--color-forest)] bg-[var(--color-forest)] text-[var(--color-cream)]'
                                    : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Feed ── */}
            {visible.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--border-color)] py-16 text-center">
                    <p className="text-[15px] font-medium text-[var(--text-primary)]">
                        {posts.length === 0 ? 'No posts yet' : `Nothing in ${activeTopic} yet`}
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        {posts.length === 0
                            ? 'Be the first to post something from one of your clubs.'
                            : 'Try another topic.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {visible.map((post) => (
                        <article
                            key={post.id}
                            className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-color)] p-5"
                        >
                            <div className="flex items-center gap-3">
                                {post.author.avatar ? (
                                    <Image
                                        src={post.author.avatar}
                                        alt={post.author.name}
                                        width={40}
                                        height={40}
                                        className="h-10 w-10 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-forest)] text-sm font-bold text-[var(--color-cream)]">
                                        {post.author.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <Link
                                        href={`/profile/${post.author.id}`}
                                        className="text-sm font-semibold text-[var(--text-primary)] hover:underline"
                                    >
                                        {post.author.name}
                                    </Link>
                                    <p className="text-xs text-[var(--text-secondary)]">
                                        <Link href={`/clubs/${post.club.id}`} className="hover:underline">
                                            {post.club.name}
                                        </Link>
                                        {' · '}
                                        {timeAgo(post.timestamp)}
                                    </p>
                                </div>
                            </div>

                            <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--text-primary)]">
                                {post.content}
                            </p>

                            {post.image && (
                                <div className="relative mt-3 h-64 w-full overflow-hidden rounded-xl">
                                    <Image src={post.image} alt="" fill className="object-cover" />
                                </div>
                            )}

                            <div className="mt-4 flex items-center gap-5 border-t border-[var(--border-color)] pt-3 text-sm text-[var(--text-secondary)]">
                                {/* Read-only, like the club feed: there is no per-user like
                                    record in the schema, so a toggle here could not tell who
                                    liked what and would be theatre. */}
                                <span className="inline-flex items-center gap-1.5">
                                    <Heart size={15} />
                                    {post.likes}
                                </span>
                                <button
                                    onClick={() => toggleComments(post.id)}
                                    className="inline-flex items-center gap-1.5 transition hover:text-[var(--text-primary)]"
                                >
                                    <MessageCircle size={15} />
                                    {post.commentCount}
                                </button>
                            </div>

                            {openComments === post.id && (
                                <div className="mt-4 space-y-3 border-t border-[var(--border-color)] pt-4">
                                    {loadingComments && !comments[post.id] ? (
                                        <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
                                    ) : (comments[post.id]?.length ?? 0) === 0 ? (
                                        <p className="text-sm text-[var(--text-secondary)]">
                                            No comments yet.
                                        </p>
                                    ) : (
                                        comments[post.id].map((c) => (
                                            <div key={c.id} className="flex gap-2.5">
                                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--border-color)] text-xs font-bold text-[var(--text-primary)]">
                                                    {c.author.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm">
                                                        <span className="font-semibold text-[var(--text-primary)]">
                                                            {c.author.name}
                                                        </span>{' '}
                                                        <span className="text-[var(--text-secondary)]">
                                                            {timeAgo(c.timestamp)}
                                                        </span>
                                                    </p>
                                                    <p className="text-sm text-[var(--text-primary)]">
                                                        {c.content}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}

                                    {user && (
                                        <div className="flex gap-2 pt-1">
                                            <input
                                                value={commentDraft}
                                                onChange={(e) => setCommentDraft(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleComment(post.id);
                                                }}
                                                placeholder="Write a comment…"
                                                maxLength={500}
                                                className="flex-1 rounded-lg border border-[var(--border-color)] bg-[var(--background-color)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                                            />
                                            <button
                                                onClick={() => handleComment(post.id)}
                                                disabled={isPending || !commentDraft.trim()}
                                                className="rounded-lg bg-[var(--color-forest)] px-3 py-2 text-sm font-semibold text-[var(--color-cream)] disabled:opacity-40"
                                            >
                                                <Send size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </article>
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
