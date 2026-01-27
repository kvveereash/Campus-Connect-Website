'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventUrl: string;
    eventName: string;
}

export default function ShareModal({ isOpen, onClose, eventUrl, eventName }: ShareModalProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(eventUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const shareLinks = [
        {
            name: 'Twitter',
            url: `https://twitter.com/intent/tweet?text=Check out ${encodeURIComponent(eventName)}!&url=${encodeURIComponent(eventUrl)}`,
            icon: '🐦',
            color: '#1DA1F2'
        },
        {
            name: 'LinkedIn',
            url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(eventUrl)}`,
            icon: '💼',
            color: '#0A66C2'
        },
        {
            name: 'WhatsApp',
            url: `https://wa.me/?text=${encodeURIComponent(`Check out ${eventName} at ${eventUrl}`)}`,
            icon: '💬',
            color: '#25D366'
        }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'absolute', inset: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            backdropFilter: 'blur(4px)'
                        }}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        style={{
                            width: '90%', maxWidth: '400px',
                            backgroundColor: 'var(--background-color)',
                            borderRadius: '1rem',
                            padding: '1.5rem',
                            position: 'relative',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                            zIndex: 10
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Share Event</h3>
                            <button
                                onClick={onClose}
                                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}
                            >
                                ×
                            </button>
                        </div>

                        {/* Social Links */}
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
                            {shareLinks.map((link) => (
                                <a
                                    key={link.name}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                                        gap: '0.5rem', textDecoration: 'none', color: 'var(--text-primary)'
                                    }}
                                >
                                    <div style={{
                                        width: '48px', height: '48px', borderRadius: '50%',
                                        backgroundColor: link.color + '20', // 20% opacity background
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '1.5rem',
                                        color: link.color
                                    }}>
                                        {link.icon}
                                    </div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>{link.name}</span>
                                </a>
                            ))}
                        </div>

                        {/* Copy Link Input */}
                        <div style={{
                            display: 'flex', alignItems: 'center',
                            backgroundColor: 'var(--surface-color)',
                            padding: '0.5rem', borderRadius: '0.5rem',
                            border: '1px solid var(--border-color)'
                        }}>
                            <input
                                type="text"
                                readOnly
                                value={eventUrl}
                                style={{
                                    flex: 1, border: 'none', background: 'transparent',
                                    color: 'var(--text-secondary)', fontSize: '0.875rem',
                                    outline: 'none', textOverflow: 'ellipsis'
                                }}
                            />
                            <button
                                onClick={handleCopy}
                                className="btn"
                                style={{
                                    backgroundColor: copied ? '#10B981' : 'var(--primary-color)',
                                    color: 'white',
                                    padding: '0.25rem 0.75rem',
                                    fontSize: '0.875rem',
                                    minWidth: '80px',
                                    transition: 'background-color 0.2s'
                                }}
                            >
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
