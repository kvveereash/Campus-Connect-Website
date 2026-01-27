
import { cn } from './utils';

describe('cn utility', () => {
    it('should merge class names correctly', () => {
        const result = cn('c1', 'c2');
        expect(result).toBe('c1 c2');
    });

    it('should handle conditional classes', () => {
        const result = cn('c1', true && 'c2', false && 'c3');
        expect(result).toBe('c1 c2');
    });

    it('should merge tailwind classes correctly', () => {
        // twMerge should override conflicting classes
        // p-4 (padding 1rem) and p-2 (padding 0.5rem) -> p-2 should win if it's last
        const result = cn('p-4', 'p-2');
        expect(result).toBe('p-2');
    });
});
