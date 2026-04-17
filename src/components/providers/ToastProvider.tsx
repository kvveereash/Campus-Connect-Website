'use client';

import { Toaster } from 'sonner';

export function ToastProvider() {
    return (
        <Toaster
            position="top-center"
            richColors
            closeButton
            toastOptions={{
                style: {
                    background: 'var(--color-cream, #F5F0E8)',
                    color: 'var(--color-forest, #0F1F1C)',
                    borderRadius: '999px',
                    border: '1.5px solid var(--color-forest, #0F1F1C)',
                    boxShadow: '4px 4px 0 var(--color-forest, #0F1F1C)',
                    fontFamily: 'var(--font-sans, Inter, sans-serif)',
                    fontSize: '0.95rem',
                    padding: '0.75rem 1.5rem',
                },
            }}
        />
    );
}

