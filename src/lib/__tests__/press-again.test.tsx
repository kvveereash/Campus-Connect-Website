import { act, renderHook } from '@testing-library/react';
import { usePressAgain } from '@/components/usePressAgain';

let now = 0;

beforeEach(() => {
    jest.useFakeTimers();
    now = 1000;
    jest.spyOn(performance, 'now').mockImplementation(() => now);
});

afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
});

function press(result: { current: ReturnType<typeof usePressAgain> }) {
    let confirmed = false;
    act(() => {
        confirmed = result.current.confirm();
    });
    return confirmed;
}

describe('usePressAgain', () => {
    it('arms on the first press and confirms on a deliberate second one', () => {
        const { result } = renderHook(() => usePressAgain());
        expect(press(result)).toBe(false);
        expect(result.current.armed).toBe(true);

        now += 1200;
        expect(press(result)).toBe(true);
        expect(result.current.armed).toBe(false);
    });

    it('does not let a double-click confirm: the second click lands too soon', () => {
        const { result } = renderHook(() => usePressAgain());
        press(result);
        now += 180; // a typical double-click gap
        expect(press(result)).toBe(false);
        expect(result.current.armed).toBe(true);
    });

    it('disarms by itself after the wait, so a later press only arms again', () => {
        const { result } = renderHook(() => usePressAgain(3000));
        press(result);
        act(() => {
            jest.advanceTimersByTime(3000);
        });
        expect(result.current.armed).toBe(false);

        now += 5000;
        expect(press(result)).toBe(false);
        expect(result.current.armed).toBe(true);
    });

    it('disarms when asked (the button loses focus)', () => {
        const { result } = renderHook(() => usePressAgain());
        press(result);
        act(() => result.current.disarm());
        expect(result.current.armed).toBe(false);
    });
});
