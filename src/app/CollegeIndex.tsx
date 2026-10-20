'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ArrowUpRight } from 'lucide-react';
import { resolveCollegeImage } from '@/lib/college-images';
import styles from './home.module.css';

gsap.registerPlugin(useGSAP);

export interface LandingCollege {
    id: string;
    name: string;
    location: string;
    clubs: number;
    events: number;
}

/**
 * The campuses as an index: big names in rows. On a mouse, a photo of the
 * campus you are pointing at follows the cursor; on touch the photo sits in
 * the row instead, since there is no hover to reveal it.
 */
export default function CollegeIndex({ colleges }: { colleges: LandingCollege[] }) {
    const root = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState<number | null>(null);

    useGSAP(
        (_ctx, contextSafe) => {
            const box = root.current;
            const preview = box?.querySelector<HTMLElement>('[data-preview]');
            if (!box || !preview || !contextSafe) return;
            if (!window.matchMedia('(pointer: fine)').matches) return;

            // Sits just right of the cursor, so it never covers the name being read.
            gsap.set(preview, { xPercent: 14, yPercent: -50, scale: 0.6, autoAlpha: 0 });
            const x = gsap.quickTo(preview, 'x', { duration: 0.55, ease: 'power3' });
            const y = gsap.quickTo(preview, 'y', { duration: 0.55, ease: 'power3' });

            const show = contextSafe((i: number | null) => {
                setActive(i);
                gsap.to(preview, {
                    autoAlpha: i === null ? 0 : 1,
                    scale: i === null ? 0.6 : 1,
                    rotation: i === null ? 0 : i % 2 ? 4 : -4,
                    duration: 0.45,
                    ease: 'power3.out',
                    overwrite: 'auto',
                });
            });
            const onMove = (e: PointerEvent) => {
                const r = box.getBoundingClientRect();
                x(e.clientX - r.left);
                y(e.clientY - r.top);
            };
            const onLeave = () => show(null);
            const rows = Array.from(box.querySelectorAll<HTMLElement>('[data-row]'));
            const enters = rows.map((row, i) => {
                const enter = () => show(i);
                row.addEventListener('pointerenter', enter);
                return () => row.removeEventListener('pointerenter', enter);
            });

            box.addEventListener('pointermove', onMove);
            box.addEventListener('pointerleave', onLeave);
            return () => {
                box.removeEventListener('pointermove', onMove);
                box.removeEventListener('pointerleave', onLeave);
                enters.forEach((off) => off());
            };
        },
        { scope: root },
    );

    return (
        <div className={styles.index} ref={root}>
            {colleges.map((c, i) => (
                <Link
                    key={c.id}
                    href={`/colleges/${c.id}`}
                    className={`${styles.indexRow} ${active !== null && active !== i ? styles.indexDim : ''}`}
                    data-row
                    data-reveal
                >
                    <span className={styles.indexNo}>{String(i + 1).padStart(2, '0')}</span>
                    <span className={styles.indexThumb}>
                        <Image src={resolveCollegeImage({ name: c.name })} alt="" fill sizes="72px" />
                    </span>
                    <span className={styles.indexName}>{c.name}</span>
                    <span className={styles.indexPlace}>
                        {c.location && c.location !== 'Unspecified' ? c.location : 'Campus'}
                    </span>
                    <span className={styles.indexCounts}>
                        <b>{c.clubs}</b> clubs <b>{c.events}</b> events
                    </span>
                    <ArrowUpRight size={22} className={styles.indexArrow} aria-hidden="true" />
                </Link>
            ))}

            <div className={styles.indexPreview} data-preview aria-hidden="true">
                {colleges.map((c, i) => (
                    <Image
                        key={c.id}
                        src={resolveCollegeImage({ name: c.name })}
                        alt=""
                        fill
                        sizes="320px"
                        className={active === i ? styles.previewOn : undefined}
                    />
                ))}
            </div>
        </div>
    );
}
