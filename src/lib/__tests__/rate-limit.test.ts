/**
 * @jest-environment node
 */
import { authLimiter, checkRateLimit, getRateLimitIdentifier, resetInMemoryRateLimits } from '../rate-limit';

const env = process.env as Record<string, string | undefined>;
const originalNodeEnv = env.NODE_ENV;

beforeEach(() => {
    resetInMemoryRateLimits();
    // Development skips limiting entirely; production without Upstash must not.
    env.NODE_ENV = 'production';
    delete env.UPSTASH_REDIS_REST_URL;
    delete env.UPSTASH_REDIS_REST_TOKEN;
});

afterAll(() => {
    env.NODE_ENV = originalNodeEnv;
});

describe('checkRateLimit without Upstash', () => {
    it('actually limits: the sixth sign-in attempt in the window is refused', async () => {
        const id = getRateLimitIdentifier('user-1');
        const results = [];
        for (let i = 0; i < 6; i++) results.push((await checkRateLimit(authLimiter, id)).success);
        expect(results).toEqual([true, true, true, true, true, false]);
    });

    it('keeps users in separate buckets', async () => {
        for (let i = 0; i < 5; i++) await checkRateLimit(authLimiter, getRateLimitIdentifier('user-1'));
        expect((await checkRateLimit(authLimiter, getRateLimitIdentifier('user-2'))).success).toBe(true);
    });
});
