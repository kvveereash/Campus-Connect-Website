'use client';

import { useState } from 'react';
import { StoryProvider } from '@/context/StoryContext';
import StoryBar from '@/components/StoryBar';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Post } from '@/types';
import Link from 'next/link';
import Image from 'next/image';
import confetti from 'canvas-confetti';
import { BadgeCheck, AlertTriangle } from 'lucide-react';
import styles from './page.module.css';

const TRENDING_TAGS = [
    { icon: '🔥', tag: 'HackFest' },
    { icon: '🍔', tag: 'CanteenVibes' },
    { icon: '🏀', tag: 'InterCollege' },
    { icon: '🤖', tag: 'AI_Workshop' },
    { icon: '🎸', tag: 'RockNight' },
    { icon: '📸', tag: 'CampusClicks' },
];

const CATEGORIES = ['All', 'Official', 'Academic', 'Social', 'Lost & Found'];

interface PollOption {
    id: string;
    text: string;
    votes: number;
}

interface Poll {
    question: string;
    options: PollOption[];
    totalVotes: number;
    userVotedOptionId?: string;
}

// Extended Post type locally for demo
interface ExtendedPost extends Post {
    category?: string;
    isOfficial?: boolean;
    isVerified?: boolean;
    isUrgent?: boolean;
    poll?: Poll;
}

export default function BuzzPage() {
    return (
        <StoryProvider>
            <BuzzContent />
        </StoryProvider>
    );
}

function BuzzContent() {
    const { user } = useAuth();
    const [activeCategory, setActiveCategory] = useState('All');

    const [posts, setPosts] = useState<ExtendedPost[]>([
        {
            id: '4',
            author: { id: 'u4', name: 'Campus Eats', avatar: '🍔' },
            content: 'We are deciding the special menu for Friday! What do you want?',
            likes: 89,
            comments: 12,
            timestamp: '2025-12-26T10:00:00.000Z',
            likedByMe: false,
            category: 'Social',
            poll: {
                question: 'Friday Special Menu?',
                totalVotes: 142,
                options: [
                    { id: 'p1', text: 'Spicy Ramen 🍜', votes: 82 },
                    { id: 'p2', text: 'Cheesy Pizza 🍕', votes: 45 },
                    { id: 'p3', text: 'Vegan Salad 🥗', votes: 15 }
                ]
            }
        },
        {
            id: 'urgent1',
            author: { id: 'admin', name: 'Campus Security', avatar: '🚨' },
            content: '⚠️ MAIN GATE CLOSED for maintenance until 2 PM. Please use the South Gate entrance.',
            likes: 45,
            comments: 2,
            timestamp: '2025-12-26T11:00:00.000Z',
            likedByMe: false,
            category: 'Official',
            isOfficial: true,
            isUrgent: true,
            isVerified: true
        },
        {
            id: '3',
            author: { id: 'admin', name: 'Student Council', avatar: '🏛️' },
            content: '📢 Final Schedule for Inter-College Sports Meet is out! Check your email.',
            likes: 156,
            comments: 0,
            timestamp: '2025-12-26T07:00:00.000Z',
            likedByMe: false,
            category: 'Official',
            isOfficial: true,
            isVerified: true
        },
        {
            id: '2',
            author: { id: 'u3', name: 'Mike Ross', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150' },
            content: 'Anyone found a blue water bottle in the library? Left it on 2nd floor.',
            likes: 12,
            comments: 8,
            timestamp: '2025-12-26T08:00:00.000Z',
            likedByMe: true,
            category: 'Lost & Found'
        },
        {
            id: '1',
            author: { id: 'u2', name: 'Sarah Chen', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150' },
            content: 'Just finished the 24h Hackathon! Sleep is for the weak 😴💻 #HackFest #CampusLife',
            image: '/hackathon_coding_1766237719122.png',
            likes: 42,
            comments: 5,
            timestamp: '2025-12-26T09:00:00.000Z',
            likedByMe: false,
            category: 'Social'
        },
    ]);
    const [newPostContent, setNewPostContent] = useState('');
    const [isPollMode, setIsPollMode] = useState(false); // Toggle for creating poll

    // Trigger Confetti
    const triggerConfetti = () => {
        confetti({
            particleCount: 50,
            spread: 70,
            origin: { y: 0.8 },
            colors: ['#FF7D5D', '#D1FAE5', '#E0C0F8', '#0F1F1C'] // Brand Colors: Orange, Mint, Lilac, Forest
        });
    };

    const handleCreatePost = () => {
        if (!newPostContent.trim()) return;

        const newPost: ExtendedPost = {
            id: Date.now().toString(),
            author: {
                id: user?.id || 'me',
                name: user?.name || 'Me',
                avatar: user?.name.charAt(0).toUpperCase() || 'U'
            },
            content: newPostContent,
            likes: 0,
            comments: 0,
            timestamp: new Date().toISOString(),
            likedByMe: false,
            category: activeCategory === 'All' ? 'Social' : activeCategory,
            // Mock poll if mode is active (simplified for demo)
            poll: isPollMode ? {
                question: 'Quick Poll',
                totalVotes: 0,
                options: [
                    { id: 'o1', text: 'Option A', votes: 0 },
                    { id: 'o2', text: 'Option B', votes: 0 }
                ]
            } : undefined
        };

        setPosts([newPost, ...posts]);
        setNewPostContent('');
        setIsPollMode(false);
        triggerConfetti(); // Celebration for posting!
    };

    const toggleLike = (postId: string) => {
        setPosts(posts.map(p => {
            if (p.id === postId) {
                // If liking (not unliking), trigger confetti
                if (!p.likedByMe) {
                    confetti({
                        particleCount: 30,
                        spread: 50,
                        origin: { y: 0.8 },
                        colors: ['#FF7D5D', '#FFE4E6'] // Red/Orange Logic
                    });
                }
                return {
                    ...p,
                    likes: p.likedByMe ? p.likes - 1 : p.likes + 1,
                    likedByMe: !p.likedByMe
                };
            }
            return p;
        }));
    };

    const handleVote = (postId: string, optionId: string) => {
        // Trigger generic confetti for voting
        triggerConfetti();

        setPosts(posts.map(p => {
            if (p.id === postId && p.poll && !p.poll.userVotedOptionId) {
                return {
                    ...p,
                    poll: {
                        ...p.poll,
                        totalVotes: p.poll.totalVotes + 1,
                        userVotedOptionId: optionId,
                        options: p.poll.options.map(opt =>
                            opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
                        )
                    }
                };
            }
            return p;
        }));
    };

    const filteredPosts = activeCategory === 'All'
        ? posts
        : posts.filter(p => p.category === activeCategory);

    return (
        <div className={styles.container} data-theme="light">
            <header className={styles.header}>
                <h1 className={styles.title}>Campus Buzz 🐝</h1>
                <p className={styles.subtitle}>What's happening around campus right now?</p>
            </header>

            {/* Stories Section */}
            <div style={{ marginBottom: '2rem' }}>
                <StoryBar />
            </div>

            {/* Category Tabs */}
            <div className={styles.categoryTabs}>
                {CATEGORIES.map(cat => (
                    <button
                        key={cat}
                        className={`${styles.categoryTab} ${activeCategory === cat ? styles.activeTab : ''}`}
                        onClick={() => setActiveCategory(cat)}
                    >
                        {cat === 'Official' && '📢 '}
                        {cat === 'Lost & Found' && '🔍 '}
                        {cat}
                    </button>
                ))}
            </div>

            {/* Create Post */}
            <div className={styles.createCard}>
                <div className={styles.userAvatar}>
                    {user?.name.charAt(0).toUpperCase()}
                </div>
                <div className={styles.postInputWrapper}>
                    <textarea
                        placeholder={`Post in ${activeCategory === 'All' ? 'Social' : activeCategory}...`}
                        className={styles.postInput}
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                    />
                    <div className={styles.postActions}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className={styles.mediaBtn}>📷</button>
                            <button className={styles.mediaBtn}>📍</button>
                            <button
                                className={`${styles.mediaBtn} ${isPollMode ? styles.activeMediaBtn : ''}`}
                                onClick={() => setIsPollMode(!isPollMode)}
                            >
                                📊
                            </button>
                        </div>
                        <button
                            className={styles.postBtn}
                            disabled={!newPostContent.trim()}
                            onClick={handleCreatePost}
                        >
                            Post Buzz
                        </button>
                    </div>
                </div>
            </div>

            {/* Trending Tags */}
            <div className={styles.trendingContainer}>
                <div className={styles.trendingWrapper}>
                    <span style={{ fontWeight: 700, color: 'var(--color-forest)', alignSelf: 'center', marginRight: '0.5rem' }}>
                        Trending:
                    </span>
                    {TRENDING_TAGS.map((item) => (
                        <div key={item.tag} className={styles.trendingTag}>
                            {item.icon} #{item.tag}
                        </div>
                    ))}
                </div>
            </div>

            {/* Feed */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <AnimatePresence mode="popLayout">
                    {filteredPosts.map(post => (
                        <motion.div
                            key={post.id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            layout
                            className={`${styles.postCard} ${post.isUrgent ? styles.urgentCard : ''}`}
                            style={post.isOfficial && !post.isUrgent ? { border: '2px solid var(--color-orange)' } : {}}
                        >
                            {/* Urgent Header */}
                            {post.isUrgent && (
                                <div className={styles.urgentHeader}>
                                    <AlertTriangle size={18} />
                                    <span>URGENT ALERT</span>
                                </div>
                            )}

                            {/* Post Header */}
                            <div className={styles.postHeader}>
                                <div className={styles.userAvatar} style={{
                                    width: '2.5rem', height: '2.5rem',
                                    fontSize: '1rem', borderRadius: '0.75rem',
                                    background: 'var(--surface-color)', border: '1px solid rgba(255,255,255,0.1)',
                                    overflow: 'hidden', padding: 0, position: 'relative'
                                }}>
                                    {post.author.avatar.startsWith('http') ? (
                                        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                            <Image
                                                src={post.author.avatar}
                                                alt={post.author.name}
                                                fill
                                                style={{ objectFit: 'cover' }}
                                            />
                                        </div>
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {post.author.avatar}
                                        </div>
                                    )}
                                </div>
                                <div className={styles.authorInfo}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <Link href={`/user/${post.author.id}`} className={styles.authorName}>
                                            {post.author.name}
                                        </Link>
                                        {post.isVerified && (
                                            <BadgeCheck size={16} color="var(--color-mint)" fill="var(--color-forest)" />
                                        )}
                                    </div>
                                    <span className={styles.timestamp}>
                                        {post.category} • {new Date(post.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>

                            {/* Content */}
                            <div className={styles.postContent}>
                                <p style={{ whiteSpace: 'pre-wrap' }}>{post.content}</p>

                                {/* POLL RENDERING */}
                                {post.poll && (
                                    <div className={styles.pollContainer}>
                                        {post.poll.options.map(option => {
                                            const percentage = post.poll!.totalVotes > 0
                                                ? Math.round((option.votes / post.poll!.totalVotes) * 100)
                                                : 0;
                                            const isSelected = post.poll!.userVotedOptionId === option.id;

                                            return (
                                                <div
                                                    key={option.id}
                                                    className={`${styles.pollOption} ${isSelected ? styles.pollSelected : ''}`}
                                                    onClick={() => !post.poll!.userVotedOptionId && handleVote(post.id, option.id)}
                                                    style={{ cursor: post.poll!.userVotedOptionId ? 'default' : 'pointer' }}
                                                >
                                                    {/* Progress Bar Background */}
                                                    <div
                                                        className={styles.pollProgress}
                                                        style={{ width: `${percentage}%` }}
                                                    />

                                                    {/* Text Content */}
                                                    <div className={styles.pollContent}>
                                                        <span style={{ fontWeight: 500 }}>{option.text}</span>
                                                        <span style={{ fontWeight: 700 }}>{percentage}%</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div className={styles.pollFooter}>
                                            {post.poll.totalVotes} votes • {post.poll.userVotedOptionId ? 'You voted' : 'Poll open'}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Image */}
                            {post.image && !post.poll && (
                                <div className={styles.postImageWrapper} style={{ position: 'relative', width: '100%', height: '300px' }}>
                                    <Image
                                        src={post.image}
                                        alt="Post content"
                                        fill
                                        style={{ objectFit: 'cover' }}
                                        className={styles.postImage}
                                    />
                                </div>
                            )}

                            {/* Actions */}
                            <div className={styles.postFooter}>
                                <button
                                    onClick={() => toggleLike(post.id)}
                                    className={`${styles.actionBtn} ${post.likedByMe ? styles.liked : ''}`}
                                >
                                    <span className={styles.icon}>{post.likedByMe ? '❤️' : '🤍'}</span>
                                    {post.likes}
                                </button>
                                <button className={styles.actionBtn}>
                                    <span>💬</span>
                                    {post.comments}
                                </button>
                                <button className={styles.actionBtn} style={{ marginLeft: 'auto' }}>
                                    <span>↗️ Share</span>
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
