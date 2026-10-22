'use client';

import { useEffect } from 'react';
import ProblemPage from '@/components/ProblemPage';
import { reportClientError } from '@/lib/report-error';
import { fontVariables } from './fonts';
import './globals.css';

/* Shown when the root layout itself fails, so it brings its own <html> and
   cannot rely on the navbar, providers or anything else the layout sets up. */
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        reportClientError(error, 'root');
    }, [error]);

    return (
        <html lang="en" className={fontVariables}>
            <body>
                <main className="container">
                    <ProblemPage
                        kicker="Campus Connect"
                        title={
                            <>
                                The site did not <em className="accent">load.</em>
                            </>
                        }
                        text="The problem is on our side and has been logged. Reload to try again."
                        reference={error.digest}
                        actions={
                            <button type="button" onClick={reset} className="btn btn-primary">
                                Reload
                            </button>
                        }
                    />
                </main>
            </body>
        </html>
    );
}
