'use client';

import { useState } from 'react';

/** A button that copies `value` and says so for two seconds. */
export default function CopyLink({ value, label = 'Copy link', className }: { value: string; label?: string; className?: string }) {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard refused (insecure context or permission): select-and-copy
            // by hand still works from the address shown next to the button.
        }
    };

    return (
        <button type="button" onClick={copy} className={className} aria-live="polite">
            {copied ? 'Copied' : label}
        </button>
    );
}
