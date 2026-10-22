'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import ProblemPage from '@/components/ProblemPage';
import { reportClientError } from '@/lib/report-error';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        reportClientError(error, 'page');
    }, [error]);

    // The message is not shown: in production a server error's message is a
    // stand-in, and a browser error's message is written for developers.
    return (
        <ProblemPage
            kicker="Something broke"
            title={
                <>
                    This page did not <em className="accent">load.</em>
                </>
            }
            text="The problem is on our side and has been logged. Try again, and if it keeps happening, head back to the events."
            reference={error.digest}
            actions={
                <>
                    <button type="button" onClick={reset} className="btn btn-primary">
                        Try again
                    </button>
                    <Link href="/events" className="btn btn-outline">
                        Browse events
                    </Link>
                </>
            }
        />
    );
}
