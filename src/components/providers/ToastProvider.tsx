'use client';

import { Toaster } from 'sonner';
import { useTheme } from 'next-themes';

export function ToastProvider() {
    const { theme } = useTheme();

    return (
        <Toaster
            position="top-center"
            theme={theme as 'light' | 'dark' | 'system'}
            richColors
            closeButton
            toastOptions={{
                classNames: {
                    toast: 'group toast !bg-[#1a1a1a] !text-white !border-none !rounded-full !shadow-[0_8px_16px_-4px_rgba(0,0,0,0.2)] !backdrop-blur-md font-sans px-6 py-3',
                    title: '!text-white !font-bold',
                    description: '!text-gray-400',
                    actionButton: '!bg-white !text-black !rounded-full',
                    cancelButton: '!bg-gray-800 !text-white !rounded-full',
                    success: '!text-[#4ade80]',
                    error: '!text-[#f87171]',
                    warning: '!text-[#facc15]',
                    info: '!text-[#60a5fa]',
                },
                style: {
                    // Fallback inline styles if classes fail
                    background: '#1a1a1a',
                    color: 'white',
                    borderRadius: '50px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.95rem'
                }
            }}
        />
    );
}
