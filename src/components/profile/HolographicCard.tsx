'use client';

import React, { useRef, useState } from 'react';
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'framer-motion';

export default function HolographicCard({ children }: { children: React.ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);

    // Mouse position state
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Smooth physics-based spring movement
    const mouseX = useSpring(x, { stiffness: 400, damping: 30 });
    const mouseY = useSpring(y, { stiffness: 400, damping: 30 });

    const [hover, setHover] = useState(false);

    // Calculate rotation based on mouse position relative to center of card
    // Range: -10deg to 10deg
    function handleMouseMove({ clientX, clientY }: React.MouseEvent) {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();

        // Calculate center of card
        const width = rect.width;
        const height = rect.height;
        const centerX = rect.left + width / 2;
        const centerY = rect.top + height / 2;

        // Calculate raw deviation from center
        const xPct = (clientX - centerX) / (width / 2); // -1 to 1
        const yPct = (clientY - centerY) / (height / 2); // -1 to 1

        x.set(xPct);
        y.set(yPct);
    }

    function handleMouseLeave() {
        setHover(false);
        x.set(0);
        y.set(0);
    }

    // Inverse rotation for tilt effect
    const rotateX = useTransform(mouseY, [-1, 1], [8, -8]);
    const rotateY = useTransform(mouseX, [-1, 1], [-8, 8]);

    // Holographic sheen position
    const bgX = useTransform(mouseX, [-1, 1], ["0%", "100%"]);
    const bgY = useTransform(mouseY, [-1, 1], ["0%", "100%"]);

    // Dynamic styles
    const transformStyle = useMotionTemplate`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${hover ? 1.02 : 1})`;

    // Holo gradient that shifts based on angle
    const sheenStyle = useMotionTemplate`
        linear-gradient(
            115deg, 
            transparent 0%, 
            rgba(255, 255, 255, 0.1) 30%, 
            rgba(255, 220, 180, 0.3) 45%, 
            rgba(200, 230, 255, 0.3) 55%, 
            rgba(255, 255, 255, 0.1) 70%, 
            transparent 100%
        )
    `;

    return (
        <motion.div
            ref={ref}
            onMouseMove={(e) => { handleMouseMove(e); setHover(true); }}
            onMouseLeave={handleMouseLeave}
            style={{
                transform: transformStyle,
                transformStyle: "preserve-3d",
            }}
            className="group relative w-full h-full"
        >
            {/* The Actual Card Content */}
            <div className="relative z-10 w-full h-full bg-white/40 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/50">
                {/* Holo Overlay */}
                <motion.div
                    className="absolute inset-0 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700 mix-blend-soft-light"
                    style={{
                        background: sheenStyle,
                        backgroundSize: "200% 200%",
                        backgroundPosition: useMotionTemplate`${bgX} ${bgY}`
                    }}
                />
                {/* Rainbow sheen for extra 'Rare Card' effect */}
                <motion.div
                    className="absolute inset-0 z-20 pointer-events-none opacity-0 group-hover:opacity-30 transition-opacity duration-700"
                    style={{
                        background: "linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%)",
                        backgroundSize: "200% 200%",
                        backgroundPosition: useMotionTemplate`${bgX} ${bgY}`
                    }}
                />

                {children}
            </div>

        </motion.div>
    );
}
