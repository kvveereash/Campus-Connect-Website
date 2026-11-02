'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// A double-click lands its second click 100-300ms after the first, after
// the button has armed; without this pause it would confirm at once.
const DOUBLE_CLICK_MS = 600;

/**
 * "Press again to …" for actions that cannot be undone (leave a club,
 * delete a club). The first press arms the button for `forMs`; a second,
 * deliberate press confirms. Returns `confirm()`, true when the action
 * should run now.
 */
export function usePressAgain(forMs = 3000) {
    const [armed, setArmed] = useState(false);
    const armedAt = useRef(0);

    useEffect(() => {
        if (!armed) return;
        const id = setTimeout(() => setArmed(false), forMs);
        return () => clearTimeout(id);
    }, [armed, forMs]);

    const confirm = useCallback(() => {
        if (!armed) {
            armedAt.current = performance.now();
            setArmed(true);
            return false;
        }
        if (performance.now() - armedAt.current < DOUBLE_CLICK_MS) return false;
        setArmed(false);
        return true;
    }, [armed]);

    const disarm = useCallback(() => setArmed(false), []);

    return { armed, confirm, disarm };
}
