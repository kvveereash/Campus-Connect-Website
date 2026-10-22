'use client';

import type { ReactNode } from 'react';

/* A ref callback runs at commit, after this element has hydrated. */
const mark = (el: HTMLElement | null) => {
    el?.setAttribute('data-reveal-group', '');
};

/**
 * A list whose children rise in as they scroll into view (ScrollReveal).
 *
 * The `data-reveal-group` marker is added on the client once the list has
 * hydrated. Written into the server HTML, it let ScrollReveal (mounted by the
 * root layout, which hydrates first) put GSAP styles on rows React had not
 * hydrated yet, and React reported the changed style attributes as a
 * hydration mismatch.
 */
export default function RevealGroup({
    as: Tag = 'div',
    className,
    children,
}: {
    as?: 'div' | 'section' | 'ul';
    className?: string;
    children: ReactNode;
}) {
    return (
        <Tag ref={mark} className={className}>
            {children}
        </Tag>
    );
}
