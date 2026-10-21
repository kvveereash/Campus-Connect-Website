'use client';

import { useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import styles from '@/app/login/auth.module.css';

gsap.registerPlugin(useGSAP);

export interface AsideBubble {
    /** The chat or club the notification is from. */
    from: string;
    /** The message preview. */
    text: string;
    /** Unread count it starts at; it ticks up while the bubbles pile up. */
    unread: number;
    /** Avatar colour. */
    color: string;
}

interface AuthAsideProps {
    /** The sentence, with its spoken part (rendered in the serif accent). */
    line: ReactNode;
    note: string;
    bubbles: AsideBubble[];
}

/**
 * The blue half of the login and signup screens, telling its sentence as a
 * loop: notifications from all over campus pop up and pile up, unread
 * counts climbing, then every one of them flies into the note at the
 * bottom, which lights up, and the panel is calm for a beat before it
 * starts again. The sentence itself rises in with CSS, so it is on screen
 * whether or not this script runs; the bubbles are decoration and simply
 * stay hidden without it, or sit still for reduced motion.
 */
export default function AuthAside({ line, note, bubbles }: AuthAsideProps) {
    const root = useRef<HTMLElement>(null);

    useGSAP(
        () => {
            const box = root.current;
            if (!box) return;
            const items = gsap.utils.toArray<HTMLElement>('[data-bubble]', box);
            const noteEl = box.querySelector<HTMLElement>('[data-note]');
            const mm = gsap.matchMedia();

            mm.add(
                { motion: '(prefers-reduced-motion: no-preference)', reduced: '(prefers-reduced-motion: reduce)' },
                (ctx) => {
                    const { reduced } = ctx.conditions as Record<string, boolean>;
                    const shown = items.filter((el) => getComputedStyle(el).display !== 'none');

                    if (reduced) {
                        gsap.set(shown, { autoAlpha: 1 });
                        return;
                    }

                    /* Each bubble bobs on its own clock, on an inner layer so it
                       never fights the pile-up and fly-in on the outer one. */
                    shown.forEach((el, i) => {
                        gsap.to(el.querySelector('[data-float]'), {
                            y: i % 2 ? 7 : -7,
                            duration: 1.8 + (i % 3) * 0.4,
                            ease: 'sine.inOut',
                            yoyo: true,
                            repeat: -1,
                        });
                    });

                    /* Where each bubble has to travel to land in the note (or
                       the panel's bottom corner on a phone, where the note is
                       hidden). Measured fresh at the start of every loop. */
                    const offset = (el: HTMLElement) => {
                        const a = el.getBoundingClientRect();
                        const n = noteEl && noteEl.offsetParent ? noteEl.getBoundingClientRect() : null;
                        const b = box.getBoundingClientRect();
                        const tx = n ? n.left + n.width / 2 : b.left + 40;
                        const ty = n ? n.top + n.height / 2 : b.bottom - 30;
                        return { x: tx - (a.left + a.width / 2), y: ty - (a.top + a.height / 2) };
                    };

                    const badges = shown.map((el) => el.querySelector<HTMLElement>('[data-unread]'));
                    const start = shown.map((el) => Number(el.dataset.unread) || 1);
                    const counts = [...start];
                    const tick = (i: number) => {
                        counts[i] += 1 + Math.floor(Math.random() * 3);
                        const b = badges[i];
                        if (!b) return;
                        b.textContent = String(counts[i]);
                        gsap.fromTo(b, { scale: 1.45 }, { scale: 1, duration: 0.35, ease: 'back.out(3)' });
                    };
                    const absorbed = noteEl?.querySelector<HTMLElement>('[data-absorbed]');

                    const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.8, delay: 0.6 });
                    tl.call(() => {
                        shown.forEach((_, i) => {
                            counts[i] = start[i];
                            if (badges[i]) badges[i]!.textContent = String(start[i]);
                        });
                        if (absorbed) absorbed.textContent = '';
                    })
                        // Pile up: they pop in at random, tilted, like a phone
                        // lighting up in a lecture.
                        .fromTo(
                            shown,
                            { autoAlpha: 0, scale: 0.5, y: 24, x: 0, rotation: (i: number) => (i % 2 ? 10 : -10) },
                            {
                                autoAlpha: 1,
                                scale: 1,
                                y: 0,
                                rotation: (i: number) => [-4, 3, -2, 5, -3, 2, -5, 4][i % 8],
                                duration: 0.6,
                                ease: 'back.out(1.8)',
                                stagger: { each: 0.28, from: 'random' },
                            },
                        );

                    // Unread counts climb while they sit there.
                    for (let k = 0; k < 10; k++) {
                        tl.call(() => tick(k % shown.length), [], 1.4 + k * 0.22);
                    }

                    // Then everything goes into the one feed.
                    tl.addLabel('gather', '+=0.6')
                        .to(
                            shown,
                            {
                                x: (_: number, el: HTMLElement) => offset(el).x,
                                y: (_: number, el: HTMLElement) => offset(el).y,
                                scale: 0.15,
                                rotation: 0,
                                autoAlpha: 0,
                                duration: 0.75,
                                ease: 'power3.in',
                                stagger: { each: 0.06, from: 'end' },
                            },
                            'gather',
                        );

                    if (noteEl) {
                        tl.call(() => {
                            if (absorbed) absorbed.textContent = `+${counts.reduce((a, c) => a + c, 0)}`;
                        }, [], 'gather+=0.9')
                            .to(
                                noteEl,
                                {
                                    scale: 1.14,
                                    backgroundColor: 'var(--color-marker)',
                                    color: 'var(--color-obsidian)',
                                    duration: 0.25,
                                    ease: 'power2.out',
                                },
                                'gather+=0.85',
                            )
                            .to(noteEl, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' })
                            .to(
                                noteEl,
                                {
                                    backgroundColor: 'rgba(255, 255, 255, 0.14)',
                                    color: 'var(--color-paper)',
                                    duration: 0.6,
                                },
                                '+=1.4',
                            );
                    } else {
                        tl.to({}, { duration: 1.6 });
                    }

                    /* A resize moves every bubble and the note; start the loop
                       over so the next fly-in is measured from where they are. */
                    let timer = 0;
                    const onResize = () => {
                        window.clearTimeout(timer);
                        timer = window.setTimeout(() => tl.restart(true), 250);
                    };
                    window.addEventListener('resize', onResize);
                    return () => {
                        window.removeEventListener('resize', onResize);
                        window.clearTimeout(timer);
                    };
                },
            );
        },
        { scope: root },
    );

    return (
        <aside className={styles.aside} ref={root}>
            <div className={styles.glow} aria-hidden="true" />

            <div className={styles.bubbles} aria-hidden="true">
                {bubbles.map((b, i) => (
                    <div key={b.from} className={`${styles.bubble} ${styles[`b${i}`]}`} data-bubble data-unread={b.unread}>
                        <div className={styles.bubbleInner} data-float>
                            <span className={styles.bubbleAvatar} style={{ background: b.color }}>
                                {b.from.charAt(0)}
                            </span>
                            <span className={styles.bubbleText}>
                                <b>{b.from}</b>
                                <span>{b.text}</span>
                            </span>
                            <span className={styles.bubbleUnread} data-unread>
                                {b.unread}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <span className={styles.wordmark}>Campus Connect</span>
            <div className={styles.asideBody}>
                <p className={styles.asideLine}>{line}</p>
            </div>
            <span className={styles.asideNote} data-note>
                {note}
                <span className={styles.absorbed} data-absorbed />
            </span>
        </aside>
    );
}
