import { test, expect, type Page } from '@playwright/test';

/* The public pages a student meets first. Each must load, show its heading,
   fit the screen and log no errors. */
const PUBLIC_PAGES = ['/', '/events', '/fests', '/clubs', '/colleges', '/buzz', '/leaderboards', '/map', '/about', '/login', '/signup'];

// Noise that is not the page's fault: the report-only CSP flags the dev
// server's own eval, and a dev-only HMR socket can drop between tests.
const IGNORED = /Content[- ]Security[- ]Policy|webpack-hmr|\[HMR\]|Download the React DevTools/i;

function watchConsole(page: Page) {
    const errors: string[] = [];
    page.on('console', (msg) => {
        if (msg.type() === 'error' && !IGNORED.test(msg.text())) errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));
    return errors;
}

async function expectNoHorizontalScroll(page: Page) {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, 'page is wider than the screen').toBeLessThanOrEqual(0);
}

/** The first link on the page to a detail page under `section`, e.g. /events/<id>. */
async function firstDetailLink(page: Page, section: string) {
    const hrefs = await page.locator(`a[href^="/${section}/"]`).evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''));
    const href = hrefs.find((h) => new RegExp(`^/${section}/[a-z0-9]{20,}$`).test(h));
    expect(href, `a link to one of the ${section}`).toBeTruthy();
    return href!;
}

for (const path of PUBLIC_PAGES) {
    test(`${path} loads, fits the screen and logs no errors`, async ({ page }) => {
        const errors = watchConsole(page);
        const response = await page.goto(path);
        expect(response?.status()).toBeLessThan(400);
        await expect(page.locator('h1').first()).toBeVisible();
        await page.waitForLoadState('networkidle');
        await expectNoHorizontalScroll(page);
        expect(errors).toEqual([]);
    });
}

test('an event opens from the list with its details', async ({ page }) => {
    await page.goto('/events');
    const href = await firstDetailLink(page, 'events');
    await page.goto(href);
    await expect(page.locator('h1').first()).toBeVisible();
    // Through the accessibility tree: until React reveals a streamed page, a
    // hidden copy of it sits in the document too, and plain text matches both.
    await expect(page.getByRole('complementary').getByText('When', { exact: true })).toBeVisible();
    await expectNoHorizontalScroll(page);
});

test('a club opens from the list', async ({ page }) => {
    await page.goto('/clubs');
    await page.goto(await firstDetailLink(page, 'clubs'));
    await expect(page.locator('h1').first()).toBeVisible();
    await expectNoHorizontalScroll(page);
});

test('a college opens from the list', async ({ page }) => {
    await page.goto('/colleges');
    await page.goto(await firstDetailLink(page, 'colleges'));
    await expect(page.locator('h1').first()).toBeVisible();
    await expectNoHorizontalScroll(page);
});

test('the home headline is visible with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    await expect.poll(() => h1.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
});

test('a missing event shows the not-found page', async ({ page }) => {
    await page.goto('/events/this-event-does-not-exist');
    await expect(page.getByRole('heading', { name: /Nothing pinned/ })).toBeVisible();
});

/* With a loading screen the response starts before the event is looked up,
   so the status may already be 200; Next then marks the page noindex. Either
   way a search engine must not keep it. */
test('a missing event cannot be indexed', async ({ request }) => {
    const res = await request.get('/events/this-event-does-not-exist', {
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
    });
    const noindex = /<meta name="robots" content="noindex"/.test(await res.text());
    expect(res.status() === 404 || noindex, `status ${res.status()}, noindex ${noindex}`).toBe(true);
});

test('a page that needs an account sends you to log in', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fsettings/);
});

test('an upcoming event offers its calendar file', async ({ page, request }) => {
    await page.goto('/events');
    const href = await firstDetailLink(page, 'events');
    await page.goto(href);
    await expect(page.getByRole('link', { name: 'Google Calendar' })).toBeVisible();

    const ics = await request.get(`${href}/calendar.ics`);
    expect(ics.headers()['content-type']).toContain('text/calendar');
    expect(await ics.text()).toContain('BEGIN:VEVENT');
});

test('the organiser pages need an account', async ({ page }) => {
    await page.goto('/events');
    const href = await firstDetailLink(page, 'events');
    await page.goto(`${href}/attendees`);
    await expect(page).toHaveURL(/\/login\?redirect=/);
});

test('the app installs: manifest, icons and an offline page', async ({ page, request }) => {
    const manifest = await (await request.get('/manifest.webmanifest')).json();
    expect(manifest.display).toBe('standalone');
    for (const icon of manifest.icons) {
        const res = await request.get(icon.src);
        expect(res.headers()['content-type'], icon.src).toBe('image/png');
    }
    await page.goto('/offline');
    await expect(page.getByRole('heading', { name: /offline/ })).toBeVisible();
});

/* Signs in only: the demo account already exists, so nothing is written. */
test('Try the demo opens the demo account, which cannot edit its profile', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Try the demo' }).click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByText('You are in the demo account.')).toBeVisible();
    await expectNoHorizontalScroll(page);

    await page.getByRole('button', { name: 'Edit profile' }).click();
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText(/demo account can look around/)).toBeVisible();
});

test('crawlers get robots.txt, a sitemap and a share image', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(await robots.text()).toContain('Sitemap:');

    const sitemap = await request.get('/sitemap.xml');
    expect(await sitemap.text()).toContain('<urlset');

    const image = await request.get('/opengraph-image');
    expect(image.headers()['content-type']).toBe('image/png');
});

/* The add-ons, from a stranger's side: nothing here writes. */
test('private links refuse anyone who should not have them', async ({ page, request }) => {
    await page.goto('/events');
    const href = await firstDetailLink(page, 'events');

    const csv = await request.get(`${href}/attendees.csv`, { maxRedirects: 0 });
    expect(csv.status()).toBe(403);

    const certificate = await request.get(`${href}/certificate`, { maxRedirects: 0 });
    expect(certificate.status()).toBe(307);
    expect(certificate.headers()['location']).toContain('/login?redirect=');

    const feed = await request.get('/api/calendar/not-a-real-link.ics');
    expect(feed.status()).toBe(404);

    await page.goto('/certificates/not-a-real-certificate');
    await expect(page.getByRole('heading', { name: 'We could not verify this certificate.' })).toBeVisible();
});

test('an event offers a way to report it, after signing in', async ({ page }) => {
    await page.goto('/events');
    await page.goto(await firstDetailLink(page, 'events'));
    await expect(page.getByRole('link', { name: 'Sign in to report' })).toBeVisible();
});

test('a college widget can be framed by other sites, and nothing else can', async ({ page, request }) => {
    await page.goto('/colleges');
    const college = await firstDetailLink(page, 'colleges');
    const id = college.split('/').pop();

    const widget = await request.get(`/embed/college/${id}`);
    expect(widget.status()).toBe(200);
    expect(widget.headers()['content-type']).toContain('text/html');
    expect(widget.headers()['content-security-policy']).toContain('frame-ancestors *');
    expect(widget.headers()['x-frame-options']).toBeUndefined();

    const board = await request.get('/events');
    expect(board.headers()['content-security-policy']).toContain("frame-ancestors 'self'");
});

test('the view counter refuses made-up sources', async ({ request }) => {
    const res = await request.post('/api/events/not-a-real-event/view?source=made-up', {
        headers: { 'user-agent': 'Mozilla/5.0 smoke test' },
    });
    expect(res.status()).toBe(400);
});

test('the interface switches to Hindi and back', async ({ page }) => {
    await page.goto('/events');
    await page.getByRole('combobox', { name: 'Language' }).selectOption('hi');
    await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
    await expect(page.getByRole('link', { name: 'इवेंट' }).first()).toBeVisible();
    await page.getByRole('combobox', { name: 'भाषा' }).selectOption('en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});
