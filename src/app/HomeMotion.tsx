'use client';

import { useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Every animation on the home page, built in page order. The markup is
 * server rendered in Landing.tsx; this finds what to move by data
 * attributes, scoped to its own root.
 *
 * One gsap.matchMedia() covers the page, so a change of breakpoint or of
 * the reduced-motion setting reverts everything and rebuilds it in order
 * (ScrollTriggers have to be created top to bottom for the pinned sections'
 * spacing to come out right). The hero entrance plays once per visit; a
 * rebuild shows the hero as it ends.
 */
export default function HomeMotion({ children, className }: { children: ReactNode; className?: string }) {
    const root = useRef<HTMLDivElement>(null);
    const introPlayed = useRef(false);

    useGSAP(
        () => {
            const q = gsap.utils.selector(root);
            const mm = gsap.matchMedia();

            mm.add(
                {
                    // The callback only runs while at least one of these
                    // matches, so one of the pair below always does. Without
                    // it a phone (no reduced motion, not desktop, no fine
                    // pointer) got no motion at all.
                    motion: '(prefers-reduced-motion: no-preference)',
                    reduced: '(prefers-reduced-motion: reduce)',
                    desktop: '(min-width: 901px)',
                    fine: '(pointer: fine)',
                },
                (ctx) => {
                    const { reduced, desktop, fine } = ctx.conditions as Record<string, boolean>;
                    const lines = q('[data-hero-line]');
                    const fades = q('[data-hero-fade]');
                    const tickets = q<HTMLElement>('[data-ticket]');
                    const heroBits = [...lines, ...fades, ...tickets];
                    /** Each card's resting tilt; GSAP owns the transform from here. */
                    const rot = (i: number) => Number(tickets[i]?.dataset.rot) || 0;

                    if (reduced) {
                        gsap.set(heroBits, { autoAlpha: 1 });
                        return;
                    }
                    gsap.set(tickets, { rotation: rot });

                    /** Below the fold right now, so hiding it costs nothing visible. */
                    const below = (el: Element) => el.getBoundingClientRect().top > window.innerHeight * 0.92;
                    const cleanups: (() => void)[] = [];

                    /* ── 1. Hero entrance ──────────────────────────────── */
                    let deckReady = introPlayed.current;
                    if (!introPlayed.current) {
                        introPlayed.current = true;
                        gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: () => void (deckReady = true) })
                            .fromTo(lines, { yPercent: 115, autoAlpha: 1 }, { yPercent: 0, duration: 1.25, stagger: 0.1 })
                            .fromTo(fades, { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, stagger: 0.06 }, 0.35)
                            .fromTo(
                                tickets,
                                {
                                    y: () => window.innerHeight * 0.5,
                                    rotation: (i: number) => rot(i) + (i - 2) * 14,
                                    autoAlpha: 0,
                                },
                                {
                                    y: 0,
                                    rotation: rot,
                                    autoAlpha: 1,
                                    duration: 1.4,
                                    stagger: { each: 0.07, from: 'center' },
                                },
                                0.2,
                            );
                    } else {
                        gsap.set(heroBits, { autoAlpha: 1 });
                    }

                    /* The deck fans out and lifts as the hero scrolls away. */
                    if (desktop) {
                        gsap.to(tickets, {
                            yPercent: (i: number) => -[30, 55, 80, 50, 25][i],
                            xPercent: (i: number) => (i - 2) * 12,
                            ease: 'none',
                            scrollTrigger: { trigger: q('[data-hero]')[0], start: 'top top', end: 'bottom top', scrub: 1 },
                        });
                    }

                    /* The deck leans toward the pointer, each card at its depth,
                       and the main buttons lean toward the cursor. */
                    if (fine) {
                        const movers = tickets.map((t) => ({
                            depth: Number(t.dataset.depth) || 1,
                            x: gsap.quickTo(t, 'x', { duration: 0.9, ease: 'power3' }),
                            y: gsap.quickTo(t, 'y', { duration: 0.9, ease: 'power3' }),
                        }));
                        const onMove = (e: PointerEvent) => {
                            if (!deckReady) return;
                            const nx = e.clientX / window.innerWidth - 0.5;
                            const ny = e.clientY / window.innerHeight - 0.5;
                            movers.forEach((m) => {
                                m.x(nx * 34 * m.depth);
                                m.y(ny * 22 * m.depth);
                            });
                        };
                        window.addEventListener('pointermove', onMove);
                        cleanups.push(() => window.removeEventListener('pointermove', onMove));

                        q<HTMLElement>('[data-magnetic]').forEach((el) => {
                            const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
                            const y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
                            const move = (e: PointerEvent) => {
                                const r = el.getBoundingClientRect();
                                x((e.clientX - (r.left + r.width / 2)) * 0.25);
                                y((e.clientY - (r.top + r.height / 2)) * 0.35);
                            };
                            const leave = () => {
                                x(0);
                                y(0);
                            };
                            el.addEventListener('pointermove', move);
                            el.addEventListener('pointerleave', leave);
                            cleanups.push(() => {
                                el.removeEventListener('pointermove', move);
                                el.removeEventListener('pointerleave', leave);
                            });
                        });
                    }

                    /* ── 2. Running band: loops that speed up with the scroll ── */
                    const loops = q<HTMLElement>('[data-band]').map((track) => {
                        const dir = Number(track.dataset.band) || 1;
                        return gsap.fromTo(
                            track,
                            { xPercent: dir > 0 ? 0 : -50 },
                            { xPercent: dir > 0 ? -50 : 0, duration: 48, ease: 'none', repeat: -1 },
                        );
                    });
                    if (loops.length) {
                        const speed = { v: 1 };
                        const apply = () => loops.forEach((l) => l.timeScale(speed.v));
                        ScrollTrigger.create({
                            trigger: loops[0].targets()[0] as Element,
                            start: 'top bottom',
                            end: 'bottom top',
                            onUpdate: (self) => {
                                const target = 1 + Math.min(Math.abs(self.getVelocity()) / 250, 7);
                                if (target <= speed.v + 0.2) return;
                                gsap.to(speed, {
                                    v: target,
                                    duration: 0.2,
                                    overwrite: true,
                                    onUpdate: apply,
                                    onComplete: () => {
                                        gsap.to(speed, { v: 1, duration: 1.4, ease: 'power2.out', onUpdate: apply });
                                    },
                                });
                            },
                        });
                    }

                    /* ── 3. Manifesto: read along, then strike it out ──── */
                    const manifesto = q<HTMLElement>('[data-manifesto]')[0];
                    if (manifesto) {
                        const tl = gsap.timeline({
                            defaults: { ease: 'none' },
                            scrollTrigger: desktop
                                ? { trigger: manifesto, start: 'top top', end: '+=140%', pin: true, pinSpacing: true, scrub: 0.6 }
                                : { trigger: manifesto, start: 'top 75%', end: 'bottom 55%', scrub: 0.6 },
                        });
                        manifesto.querySelectorAll<HTMLElement>('[data-strike]').forEach((strike) => {
                            const words = strike.parentElement?.querySelectorAll('[data-word]') ?? [];
                            tl.fromTo(words, { opacity: 0.12 }, { opacity: 1, stagger: 0.12, duration: 0.12 })
                                .fromTo(strike, { scaleX: 0 }, { scaleX: 1, duration: 0.35 });
                        });
                        tl.fromTo(
                            manifesto.querySelector('[data-oneboard]'),
                            { opacity: 0.12, scale: 0.85, rotation: -4 },
                            { opacity: 1, scale: 1, rotation: -2, duration: 0.5, ease: 'back.out(2)' },
                        );
                    }

                    /* ── 4. This week: the rail slides sideways while pinned ── */
                    const week = q<HTMLElement>('[data-week]')[0];
                    const rail = q<HTMLElement>('[data-rail]')[0];
                    const viewport = q<HTMLElement>('[data-rail-viewport]')[0];
                    if (desktop && week && rail && viewport) {
                        const distance = () => Math.max(0, rail.scrollWidth - viewport.clientWidth);
                        gsap.to(rail, {
                            x: () => -distance(),
                            ease: 'none',
                            scrollTrigger: {
                                trigger: week,
                                start: 'top top',
                                end: () => `+=${distance()}`,
                                pin: true,
                                pinSpacing: true,
                                scrub: 0.8,
                                invalidateOnRefresh: true,
                            },
                        });
                    }

                    /* ── 5. Feature sheets: each one settles back as the next lands ── */
                    const sheets = q<HTMLElement>('[data-sheet]');
                    sheets.forEach((sheet, i) => {
                        const next = sheets[i + 1];
                        if (!next) return;
                        gsap.to(sheet, {
                            scale: 0.92,
                            '--dim': 0.35,
                            ease: 'none',
                            scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 20%', scrub: true },
                        });
                    });

                    /* ── 6. Counters ───────────────────────────────────── */
                    q<HTMLElement>('[data-count]').forEach((el) => {
                        const to = Number(el.dataset.count) || 0;
                        if (!below(el) || to === 0) return;
                        const n = { v: 0 };
                        el.textContent = '0';
                        gsap.to(n, {
                            v: to,
                            duration: 1.8,
                            ease: 'power3.out',
                            onUpdate: () => void (el.textContent = String(Math.round(n.v))),
                            onComplete: () => void (el.textContent = String(to)),
                            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
                        });
                        cleanups.push(() => void (el.textContent = String(to)));
                    });

                    /* ── 7. Collage: photos drift at their own speeds ───── */
                    q<HTMLElement>('[data-speed]').forEach((photo) => {
                        const speed = Number(photo.dataset.speed) || 0;
                        gsap.fromTo(
                            photo,
                            { yPercent: speed * -120 },
                            {
                                yPercent: speed * 120,
                                ease: 'none',
                                scrollTrigger: {
                                    trigger: photo.parentElement,
                                    start: 'top bottom',
                                    end: 'bottom top',
                                    scrub: true,
                                },
                            },
                        );
                    });

                    /* ── 8. Organiser form fills in, row by row ─────────── */
                    const rows = q('[data-org-row]');
                    if (rows.length && below(rows[0])) {
                        gsap.from(rows, {
                            x: 28,
                            autoAlpha: 0,
                            duration: 0.8,
                            stagger: 0.1,
                            ease: 'expo.out',
                            scrollTrigger: { trigger: rows[0], start: 'top 85%', once: true },
                        });
                    }

                    /* ── 9. Close: the last line grows into place ──────── */
                    const closeTitle = q('[data-close-title]')[0];
                    if (closeTitle) {
                        gsap.fromTo(
                            closeTitle,
                            { scale: 0.82, yPercent: 18 },
                            {
                                scale: 1,
                                yPercent: 0,
                                ease: 'none',
                                scrollTrigger: { trigger: closeTitle, start: 'top bottom', end: 'center 55%', scrub: true },
                            },
                        );
                    }

                    /* ── 10. Everything else marked data-reveal rises in ── */
                    const reveals = q('[data-reveal]').filter(below);
                    if (reveals.length) {
                        gsap.set(reveals, { autoAlpha: 0, y: 44 });
                        ScrollTrigger.batch(reveals, {
                            start: 'top 90%',
                            once: true,
                            onEnter: (batch) =>
                                gsap.to(batch, {
                                    autoAlpha: 1,
                                    y: 0,
                                    duration: 1.1,
                                    stagger: 0.08,
                                    ease: 'expo.out',
                                    overwrite: true,
                                }),
                        });
                    }

                    /* Web fonts change line lengths, and with them every trigger. */
                    document.fonts?.ready.then(() => ScrollTrigger.refresh());

                    return () => cleanups.forEach((off) => off());
                },
            );
        },
        { scope: root },
    );

    return (
        <div ref={root} className={className}>
            {children}
        </div>
    );
}
