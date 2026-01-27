'use client';

import React from 'react';

/**
 * BackgroundBlobs provides a soft, atmospheric background effect
 * matching the Modern Editorial aesthetic of Campus Connect.
 */
export default function BackgroundBlobs() {
    return (
        <div className="blob-container" aria-hidden="true">
            <div className="blob blob-1" />
            <div className="blob blob-2" />
            <div className="blob blob-3" />
        </div>
    );
}
