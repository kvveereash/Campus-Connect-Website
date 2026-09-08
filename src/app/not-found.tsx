import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
            <p className="text-6xl font-bold tracking-tight text-[var(--text-primary)] sm:text-7xl">404</p>

            <h1 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">
                We couldn&apos;t find that page
            </h1>

            <p className="mt-2 text-[15px] leading-relaxed text-[var(--text-secondary)]">
                The link may be out of date, or the event, club or profile you&apos;re looking for
                has been removed.
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link
                    href="/events"
                    className="rounded-lg bg-[var(--color-forest)] px-5 py-2.5 text-sm font-semibold text-[var(--color-cream)] transition hover:opacity-90"
                >
                    Browse events
                </Link>
                <Link
                    href="/"
                    className="rounded-lg border border-[var(--border-color)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-color)]"
                >
                    Go home
                </Link>
            </div>
        </div>
    );
}
