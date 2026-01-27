'use client';

import { useEffect } from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';
import Link from 'next/link';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center px-4">
            <div className="glass-panel p-8 max-w-md w-full flex flex-col items-center border border-red-500/30 shadow-[0_0_50px_-12px_rgba(239,68,68,0.3)]">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6 text-red-500 border border-red-500/20">
                    <AlertCircle size={32} />
                </div>

                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-amber-500">
                    Something went wrong!
                </h2>

                <p className="text-slate-400 mt-2 mb-8">
                    {error.message || "An unexpected error occurred while processing your request."}
                </p>

                <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <button
                        onClick={reset}
                        className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                        <RotateCw size={18} />
                        Try again
                    </button>
                    <Link
                        href="/"
                        className="btn btn-outline flex-1"
                    >
                        Go Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
