'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function FloatingChatButton() {
    const pathname = usePathname();
    const [isVisible, setIsVisible] = useState(true);

    // Optional: Hide button on /chat page itself if desired, or keep it.
    // Usually standard to hide if you are already there, or maybe just highlight it.
    // Let's decide to hide it if we are on /chat to avoid redundancy? 
    // Or keep it for consistency but maybe disable it.
    // For now, let's keep it visible everywhere except maybe login/signup if they existed without layout.

    // Actually, user might want to access chat from anywhere.
    // Let's check if we are on /chat
    const isChatPage = pathname === '/chat';

    if (isChatPage) return null;

    return (
        <Link href="/chat">
            <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'var(--color-lilac)', // Lilac pop
                    color: 'var(--color-forest)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '4px 4px 0px var(--color-forest)', // Sticker shadow
                    zIndex: 1000,
                    cursor: 'pointer',
                    fontSize: '1.75rem',
                    border: '1.5px solid var(--color-forest)', // Sticker border
                    transition: 'all 0.2s ease'
                }}
            >
                💬
            </motion.div>
        </Link>
    );
}
