'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { createClubPost, deleteClubPost, editClubPost, createPostComment, getPostComments, deletePostComment } from '@/lib/actions/clubs';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import styles from './ClubFeed.module.css';

interface Post {
    id: string;
    content: string;
    image?: string | null;
    timestamp: string;
    author: {
        id: string;
        name: string;
        avatar?: string | null;
    };
    likes: number;
    comments: number;
    authorId?: string;
}

interface Comment {
    id: string;
    content: string;
    timestamp: string;
    author: {
        id: string;
        name: string;
        avatar?: string | null;
    };
    authorId: string;
}

interface ClubFeedProps {
    clubId: string;
    initialPosts: Post[];
    isMember: boolean;
    currentUserId?: string;
}

export default function ClubFeed({ clubId, initialPosts, isMember, currentUserId: propUserId }: ClubFeedProps) {
    const { user } = useAuth();
    // Use prop if available (from server), else context (client side fallback)
    const currentUserId = propUserId || user?.id;

    const [posts, setPosts] = useState<Post[]>(initialPosts);
    const [content, setContent] = useState('');
    const [isPending, startTransition] = useTransition();

    // Edit/Delete state
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

    // Comments State
    const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
    const [comments, setComments] = useState<Record<string, Comment[]>>({});
    const [commentContent, setCommentContent] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        if (!user) {
            toast.error("You must be logged in to post.");
            return;
        }

        // Optimistic update
        const tempId = `temp-${Date.now()}`;
        const optimisticPost: Post = {
            id: tempId,
            content,
            timestamp: new Date().toISOString(),
            author: {
                id: user.id,
                name: user.name,
                avatar: user.avatar
            },
            authorId: user.id,
            likes: 0,
            comments: 0
        };

        setPosts([optimisticPost, ...posts]);
        setContent('');
        const postContent = content;

        startTransition(async () => {
            const result = await createClubPost(clubId, postContent);
            if (result.success) {
                toast.success('Post created!');
                setPosts(prev => prev.map(p => p.id === tempId ? { ...p, ...(result.data || {}), timestamp: (result.data?.timestamp ? new Date(result.data.timestamp).toISOString() : new Date().toISOString()) } : p));
            } else {
                toast.error(result.error || 'Failed to post');
                setPosts(prev => prev.filter(p => p.id !== tempId));
                setContent(postContent);
            }
        });
    };

    const handleDelete = async (postId: string) => {
        if (!confirm('Are you sure you want to delete this post?')) return;

        const previousPosts = [...posts];
        setPosts(prev => prev.filter(p => p.id !== postId));

        const result = await deleteClubPost(postId, clubId);
        if (result.success) {
            toast.success('Post deleted');
        } else {
            toast.error(result.error);
            setPosts(previousPosts);
        }
    };

    const startEdit = (post: Post) => {
        setEditingPostId(post.id);
        setEditContent(post.content);
        setMenuOpenId(null);
    };

    const cancelEdit = () => {
        setEditingPostId(null);
        setEditContent('');
    };

    const saveEdit = async (postId: string) => {
        if (!editContent.trim()) return;

        const previousPosts = [...posts];
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, content: editContent } : p));
        setEditingPostId(null);

        const result = await editClubPost(postId, clubId, editContent);
        if (result.success) {
            toast.success('Post updated');
        } else {
            toast.error(result.error);
            setPosts(previousPosts);
        }
    };

    const toggleMenu = (postId: string) => {
        setMenuOpenId(menuOpenId === postId ? null : postId);
    };

    // --- Comments Logic ---

    const toggleComments = async (postId: string) => {
        if (expandedPostId === postId) {
            setExpandedPostId(null);
            return;
        }

        setExpandedPostId(postId);
        if (!comments[postId]) {
            setLoadingComments(true);
            const result = await getPostComments(postId);
            setLoadingComments(false);
            if (result.success) {
                const formattedComments = (result.data || []).map((c: any) => ({
                    ...c,
                    timestamp: new Date(c.timestamp).toISOString()
                }));
                setComments(prev => ({ ...prev, [postId]: formattedComments }));
            } else {
                toast.error('Failed to load comments');
            }
        }
    };

    const handlePostComment = async (e: React.FormEvent, postId: string) => {
        e.preventDefault();
        if (!commentContent.trim()) return;
        if (!user) return;

        const tempId = 'temp-c-' + Date.now();
        const newComment: Comment = {
            id: tempId,
            content: commentContent,
            timestamp: new Date().toISOString(),
            author: {
                id: user.id,
                name: user.name,
                avatar: user.avatar
            },
            authorId: user.id
        };

        // Optimistic
        setComments(prev => ({
            ...prev,
            [postId]: [...(prev[postId] || []), newComment]
        }));
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: (p.comments || 0) + 1 } : p));
        setCommentContent('');

        const result = await createPostComment(postId, newComment.content);
        if (!result.success) {
            toast.error('Failed to post comment');
            setComments(prev => ({
                ...prev,
                [postId]: prev[postId].filter(c => c.id !== tempId)
            }));
            setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: Math.max(0, (p.comments || 0) - 1) } : p));
        }
    };

    const handleDeleteComment = async (commentId: string, postId: string) => {
        if (!confirm("Delete comment?")) return;

        const previousComments = comments[postId] || [];
        setComments(prev => ({
            ...prev,
            [postId]: prev[postId].filter(c => c.id !== commentId)
        }));
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: Math.max(0, (p.comments || 0) - 1) } : p));

        const result = await deletePostComment(commentId, postId);
        if (!result.success) {
            toast.error("Failed to delete comment");
            setComments(prev => ({ ...prev, [postId]: previousComments }));
            setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: (p.comments || 0) + 1 } : p));
        }
    };

    return (
        <div className={styles.feedContainer}>

            {isMember ? (
                <form onSubmit={handleSubmit} className={styles.createPostForm}>
                    <div className={styles.inputWrapper}>
                        <div className={styles.userAvatar}>
                            {user?.name?.charAt(0) || '?'}
                        </div>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Share something with the club..."
                            className={styles.postInput}
                            rows={3}
                            disabled={isPending}
                        />
                    </div>
                    <div className={styles.formFooter}>
                        <button
                            type="submit"
                            className={styles.postButton}
                            disabled={!content.trim() || isPending}
                        >
                            {isPending ? 'Posting...' : 'Post'}
                        </button>
                    </div>
                </form>
            ) : (
                <div className={styles.joinPrompt}>
                    Join the club to participate in discussions!
                </div>
            )}

            <div className={styles.postsList}>
                {posts.length > 0 ? (
                    posts.map(post => {
                        const isAuthor = currentUserId === (post.authorId || post.author.id);

                        return (
                            <div key={post.id} className={styles.postCard}>
                                <div className={styles.postHeader}>
                                    <div className={styles.postAvatar}>
                                        {post.author.avatar ? (
                                            <Image src={post.author.avatar} alt={post.author.name} width={40} height={40} style={{ borderRadius: '50%' }} />
                                        ) : (
                                            <div className={styles.avatarPlaceholder}>{post.author.name.charAt(0)}</div>
                                        )}
                                    </div>
                                    <div className={styles.postMeta}>
                                        <span className={styles.authorName}>{post.author.name}</span>
                                        <span className={styles.timestamp}>
                                            {new Date(post.timestamp).toLocaleDateString(undefined, {
                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </span>
                                    </div>

                                    {isAuthor && editingPostId !== post.id && (
                                        <div style={{ position: 'relative', marginLeft: 'auto' }}>
                                            <button
                                                className={styles.actionButton}
                                                onClick={() => toggleMenu(post.id)}
                                                style={{ padding: '0.4rem', borderRadius: '50%' }}
                                            >
                                                •••
                                            </button>

                                            {menuOpenId === post.id && (
                                                <div className={styles.menuDropdown}>
                                                    <button onClick={() => startEdit(post)}>Edit</button>
                                                    <button onClick={() => handleDelete(post.id)} style={{ color: '#ef4444' }}>Delete</button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {editingPostId === post.id ? (
                                    <div className={styles.editMode}>
                                        <textarea
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            className={styles.postInput}
                                            style={{ minHeight: '100px', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}
                                        />
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button onClick={cancelEdit} className={styles.actionButton}>Cancel</button>
                                            <button onClick={() => saveEdit(post.id)} className={styles.postButton} style={{ padding: '0.5rem 1rem' }}>Save</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <p className={styles.postContent}>{post.content}</p>
                                        {post.image && (
                                            <div className={styles.postImageWrapper}>
                                                <Image
                                                    src={post.image}
                                                    alt="Post attachment"
                                                    width={500}
                                                    height={300}
                                                    style={{ objectFit: 'cover', borderRadius: '8px', width: '100%', height: 'auto' }}
                                                />
                                            </div>
                                        )}
                                        <div className={styles.postFooter}>
                                            <button className={styles.actionButton}>
                                                ❤️ {post.likes}
                                            </button>
                                            <button
                                                className={`${styles.actionButton} ${expandedPostId === post.id ? styles.activeAction : ''}`}
                                                onClick={() => toggleComments(post.id)}
                                            >
                                                💬 {post.comments || 0}
                                            </button>
                                        </div>

                                        {expandedPostId === post.id && (
                                            <div className={styles.commentsSection}>
                                                <div className={styles.commentsList}>
                                                    {loadingComments && (!comments[post.id]) ? (
                                                        <div className={styles.loading}>Loading comments...</div>
                                                    ) : (
                                                        (comments[post.id] || []).map(comment => (
                                                            <div key={comment.id} className={styles.commentItem}>
                                                                <div className={styles.commentAvatar}>
                                                                    {comment.author.avatar ? (
                                                                        <Image src={comment.author.avatar} width={28} height={28} alt="" style={{ borderRadius: '50%' }} />
                                                                    ) : (
                                                                        <div className={styles.miniAvatar}>{comment.author.name.charAt(0)}</div>
                                                                    )}
                                                                </div>
                                                                <div className={styles.commentContent}>
                                                                    <div className={styles.commentHeader}>
                                                                        <span className={styles.commentAuthor}>{comment.author.name}</span>
                                                                        <span className={styles.commentTime}>
                                                                            {new Date(comment.timestamp).toLocaleDateString(undefined, {
                                                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                                            })}
                                                                        </span>
                                                                    </div>
                                                                    <div className={styles.commentText}>{comment.content}</div>
                                                                </div>
                                                                {(currentUserId === comment.authorId) && (
                                                                    <button
                                                                        className={styles.deleteCommentBtn}
                                                                        onClick={() => handleDeleteComment(comment.id, post.id)}
                                                                        title="Delete comment"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))
                                                    )}
                                                    {!loadingComments && (!comments[post.id] || comments[post.id].length === 0) && (
                                                        <div className={styles.emptyComments}>No comments yet.</div>
                                                    )}
                                                </div>

                                                {isMember && (
                                                    <form onSubmit={(e) => handlePostComment(e, post.id)} className={styles.commentForm}>
                                                        <input
                                                            type="text"
                                                            className={styles.commentInput}
                                                            placeholder="Write a comment..."
                                                            value={commentContent}
                                                            onChange={(e) => setCommentContent(e.target.value)}
                                                        />
                                                        <button type="submit" disabled={!commentContent.trim()} className={styles.commentSubmitBtn}>
                                                            ➤
                                                        </button>
                                                    </form>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className={styles.emptyFeed}>
                        <p>No posts yet. Be the first to start the conversation!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
