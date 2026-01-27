'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

// Code symbols and emojis to float
const SYMBOLS = [
    '{ }', '< >', '( )', '[ ]', '// ', '/*', '*/',
    '===', '=>', '&&', '||', '!=', '++', '--',
    'fn', 'if', 'for', '🎓', '💡', '⚡', '🚀', '✨',
    '$', '#', '@', '%', '&', '~', '^', '::',
];

const COLORS = [
    '#c4b5fd', // light purple
    '#86efac', // light green
    '#fde047', // bright yellow
    '#f9a8d4', // light pink
    '#93c5fd', // light blue
    '#fda4af', // light coral
    '#ffffff', // white
];

interface Particle {
    id: number;
    symbol: string;
    x: number;
    y: number;
    size: number;
    color: string;
    duration: number;
    delay: number;
    direction: 'up' | 'down' | 'left' | 'right';
}

export default function FloatingParticles({ count = 20 }: { count?: number }) {
    const [particles, setParticles] = useState<Particle[]>([]);

    useEffect(() => {
        const newParticles: Particle[] = [];
        for (let i = 0; i < count; i++) {
            newParticles.push({
                id: i,
                symbol: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
                x: Math.random() * 100,
                y: Math.random() * 100,
                size: Math.random() * 16 + 14, // 14-30px (larger)
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                duration: Math.random() * 15 + 10, // 10-25s (faster)
                delay: Math.random() * 3,
                direction: ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)] as Particle['direction'],
            });
        }
        setParticles(newParticles);
    }, [count]);

    const getAnimationProps = (particle: Particle) => {
        const distance = 40; // More movement
        switch (particle.direction) {
            case 'up':
                return { y: [0, -distance, 0] };
            case 'down':
                return { y: [0, distance, 0] };
            case 'left':
                return { x: [0, -distance, 0] };
            case 'right':
                return { x: [0, distance, 0] };
        }
    };

    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                overflow: 'hidden',
                pointerEvents: 'none',
                zIndex: 1,
            }}
        >
            {particles.map((particle) => (
                <motion.div
                    key={particle.id}
                    initial={{ opacity: 0 }}
                    animate={{
                        opacity: [0.4, 0.9, 0.4], // Higher opacity
                        rotate: [0, 15, -15, 0],
                        scale: [1, 1.2, 1],
                        ...getAnimationProps(particle),
                    }}
                    transition={{
                        duration: particle.duration,
                        delay: particle.delay,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                    style={{
                        position: 'absolute',
                        left: `${particle.x}%`,
                        top: `${particle.y}%`,
                        fontSize: `${particle.size}px`,
                        color: particle.color,
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        textShadow: `0 0 20px ${particle.color}, 0 0 40px ${particle.color}50`,
                        userSelect: 'none',
                    }}
                >
                    {particle.symbol}
                </motion.div>
            ))}
        </div>
    );
}
