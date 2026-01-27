'use client';

import { useState, useEffect } from 'react';
import { Story } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface StoryViewerProps {
    stories: Story[];
    initialIndex?: number;
    onClose: () => void;
}

export default function StoryViewer({ stories, initialIndex = 0, onClose }: StoryViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const story = stories[currentIndex];

    useEffect(() => {
        // Auto-advance
        const timer = setTimeout(() => {
            if (currentIndex < stories.length - 1) {
                setCurrentIndex(prev => prev + 1);
            } else {
                onClose();
            }
        }, 5000); // 5 seconds per story

        return () => clearTimeout(timer);
    }, [currentIndex, stories.length, onClose]);

    const handleNext = () => {
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    if (!story) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'black',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            {/* Progress Bar Container */}
            <div style={{
                position: 'absolute',
                top: '1rem',
                left: '1rem',
                right: '1rem',
                display: 'flex',
                gap: '4px',
                zIndex: 10
            }}>
                {stories.map((s, idx) => (
                    <div key={s.id} style={{
                        height: '3px',
                        flex: 1,
                        background: 'rgba(255,255,255,0.3)',
                        borderRadius: '2px',
                        overflow: 'hidden'
                    }}>
                        <motion.div
                            initial={{ width: idx < currentIndex ? '100%' : '0%' }}
                            animate={{ width: idx === currentIndex ? '100%' : idx < currentIndex ? '100%' : '0%' }}
                            transition={idx === currentIndex ? { duration: 5, ease: 'linear' } : { duration: 0 }}
                            style={{
                                height: '100%',
                                background: 'white'
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* User Info */}
            <div style={{
                position: 'absolute',
                top: '2.5rem',
                left: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                zIndex: 10
            }}>
                <div style={{
                    width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-color)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '12px'
                }}>
                    {story.userAvatar}
                </div>
                <span style={{ color: 'white', fontWeight: 600 }}>{story.userName}</span>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>
                    {new Date(story.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>

            {/* Close Button */}
            <button
                onClick={onClose}
                style={{
                    position: 'absolute',
                    top: '2rem',
                    right: '1rem',
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    zIndex: 20
                }}
            >
                ✕
            </button>

            {/* Interaction Zones */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                <div style={{ flex: 1, cursor: 'pointer' }} onClick={handlePrev} />
                <div style={{ flex: 1, cursor: 'pointer' }} onClick={handleNext} />
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={story.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    {story.mediaType === 'video' ? (
                        <video src={story.mediaUrl} autoPlay loop muted style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                    ) : (
                        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                            <Image
                                src={story.mediaUrl}
                                alt="Story"
                                fill
                                style={{ objectFit: 'contain' }}
                                unoptimized={story.mediaUrl.startsWith('blob:')}
                            />
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div >
    );
}
