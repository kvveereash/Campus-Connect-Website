'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { useState, useEffect } from 'react';

export default function Search({ placeholder }: { placeholder: string }) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    // Use local state for immediate feedback on input
    const [inputValue, setInputValue] = useState(searchParams.get('search')?.toString() || '');

    const handleSearch = useDebouncedCallback((term: string) => {
        const params = new URLSearchParams(searchParams);
        if (term) {
            params.set('search', term);
        } else {
            params.delete('search');
        }
        replace(`${pathname}?${params.toString()}`);
    }, 300);

    useEffect(() => {
        // If URL changes explicitly (e.g. back button), sync input
        setInputValue(searchParams.get('search')?.toString() || '');
    }, [searchParams]);

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <span style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.4)',
                pointerEvents: 'none'
            }} aria-hidden="true">🔍</span>
            <input
                type="text"
                placeholder={placeholder}
                value={inputValue}
                onChange={(e) => {
                    setInputValue(e.target.value);
                    handleSearch(e.target.value);
                }}
                style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.8rem',
                    borderRadius: '999px',
                    border: '1px solid rgba(15, 31, 28, 0.1)',
                    background: '#f1f5f9',
                    color: '#0F1F1C',
                    outline: 'none',
                    fontSize: '0.95rem',
                    transition: 'all 0.2s ease',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                }}
                onFocus={(e) => {
                    e.target.style.background = '#ffffff';
                    e.target.style.borderColor = '#E0C0F8';
                    e.target.style.boxShadow = '0 0 0 3px rgba(224, 192, 248, 0.3)';
                }}
                onBlur={(e) => {
                    e.target.style.background = '#f1f5f9';
                    e.target.style.borderColor = 'rgba(15, 31, 28, 0.1)';
                    e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.05)';
                }}
            />
        </div>
    );
}
