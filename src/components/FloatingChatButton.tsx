'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

export default function FloatingChatButton() {
    const pathname = usePathname();

    // Hide the button when the user is already looking at their messages.
    if (pathname === '/messages') return null;

    return (
        <Link href="/messages">
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
