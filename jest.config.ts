
import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
    // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
    dir: './',
});

// Add any custom config to be passed to Jest
const config: Config = {
    coverageProvider: 'v8',
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        // The real module throws outside a React Server Component build.
        '^server-only$': '<rootDir>/node_modules/server-only/empty.js',
    }
};

/* sanitize-html's patched releases depend on htmlparser2 12 and its dom*
   siblings, which ship as ESM only. next/jest skips transforming node_modules
   apart from its own allow-list, and appends rather than replaces any pattern
   we pass, so these are added to that allow-list after the config resolves. */
const ESM_DEPENDENCIES = ['htmlparser2', 'domhandler', 'domutils', 'dom-serializer', 'domelementtype', 'entities'];
const ESM_ALLOW = `(?:sanitize-html/node_modules/)?(?:${ESM_DEPENDENCIES.join('|')})|`;

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default async () => {
    const resolved = await createJestConfig(config)();
    resolved.transformIgnorePatterns = (resolved.transformIgnorePatterns ?? []).map((pattern) =>
        pattern.startsWith('/node_modules/(?!.pnpm)(?!(')
            ? pattern.replace('(?!(', `(?!(${ESM_ALLOW}`)
            : pattern
    );
    return resolved;
};
