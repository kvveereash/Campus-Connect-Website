import { render, screen, waitFor } from '@testing-library/react';
import AnimatedCounter from '../AnimatedCounter';

/**
 * jsdom has no IntersectionObserver, and the preview surfaces used for manual
 * checks report a zero-height viewport — so `useInView` can never become true
 * there. Forcing it true here is the only way to actually exercise the count-up.
 *
 * These lock in the count-up behaviour so a future change to the animation
 * cannot silently leave the landing page stats reading "0".
 */
jest.mock('framer-motion', () => {
    const actual = jest.requireActual('framer-motion');
    return { ...actual, useInView: () => true };
});

describe('AnimatedCounter', () => {
    it('counts up to the target value once in view', async () => {
        render(<AnimatedCounter to={14} duration={0.1} />);

        await waitFor(
            () => expect(screen.getByText('14')).toBeInTheDocument(),
            { timeout: 4000 }
        );
    });

    it('renders the suffix alongside the value', async () => {
        render(<AnimatedCounter to={20} suffix="+" duration={0.1} />);

        await waitFor(
            () => expect(screen.getByText('20+')).toBeInTheDocument(),
            { timeout: 4000 }
        );
    });

    it('does not get stuck on the starting value', async () => {
        const { container } = render(<AnimatedCounter to={340} duration={0.1} />);

        await waitFor(
            () => expect(container.textContent).not.toBe('0'),
            { timeout: 4000 }
        );
    });
});
