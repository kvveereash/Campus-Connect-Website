import { defineConfig, devices } from '@playwright/test';

/*
 * Browser smoke tests: the definition of done in CLAUDE.md, checked by a
 * machine. `npm run e2e` runs them against a running site (the dev server by
 * default, started if it is not up). They only read: no sign-ups, posts or
 * registrations, because the only database is the shared one.
 *
 * They drive the Edge that ships with Windows, so nothing is downloaded. Set
 * E2E_CHANNEL=chrome (or install Playwright's Chromium and set it empty) to
 * use another browser, and E2E_BASE_URL to test a deploy instead.
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const channel = process.env.E2E_CHANNEL ?? 'msedge';

export default defineConfig({
    testDir: './e2e',
    timeout: 60_000,
    expect: { timeout: 15_000 },
    // The dev server compiles each route on first visit; one worker keeps
    // that from turning into a pile of timeouts.
    workers: 1,
    reporter: [['list']],
    use: {
        baseURL,
        channel: channel || undefined,
        trace: 'retain-on-failure',
    },
    projects: [
        { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
        { name: 'phone', use: { ...devices['Pixel 5'], viewport: { width: 375, height: 812 } } },
    ],
    webServer: process.env.E2E_BASE_URL
        ? undefined
        : { command: 'npm run dev', url: baseURL, reuseExistingServer: true, timeout: 180_000 },
});
