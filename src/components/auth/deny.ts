/**
 * A short sideways shake on a button whose action was refused (a wrong
 * password, an email already taken), so the "no" lands where the press
 * was, not only in a toast across the screen. Transform only; skipped when
 * the visitor asks for reduced motion.
 */
export function deny(el: HTMLElement | null) {
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.animate(
        [
            { transform: 'translateX(0)' },
            { transform: 'translateX(-6px)' },
            { transform: 'translateX(6px)' },
            { transform: 'translateX(-4px)' },
            { transform: 'translateX(4px)' },
            { transform: 'translateX(-2px)' },
            { transform: 'translateX(0)' },
        ],
        { duration: 400, easing: 'ease-out' },
    );
}
