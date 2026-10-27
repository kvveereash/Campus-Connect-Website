import prisma from '@/lib/db';
import { formatIST } from '@/lib/format';
import { SITE_URL } from '@/lib/site';

/*
 * The events widget a college or club pastes into its own website
 * (public/embed.js puts an iframe of /embed/{kind}/{id} on their page).
 *
 * It is a complete HTML document built as a string, served by a route handler
 * rather than a React page, because the root layout would bring the site's
 * navbar, fonts and scripts into someone else's page. Nothing here may trust
 * the text it prints: every title, venue and name goes through escapeHtml.
 */

export type EmbedKind = 'college' | 'club';
export type EmbedTheme = 'light' | 'dark';

export type EmbedEvent = {
    id: string;
    title: string;
    date: Date;
    venue: string;
    category: string;
    price: number;
};

export type EmbedData = {
    kind: EmbedKind;
    id: string;
    name: string;
    events: EmbedEvent[];
};

export const EMBED_LIMIT = 10;

/** Ids are cuids (or short seeded slugs); anything else is not worth a query. */
const VALID_ID = /^[\w-]{1,64}$/;

const ESCAPES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

/** Safe to place in element text and in quoted attribute values. */
export function escapeHtml(value: string): string {
    return String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

export function themeFrom(url: string): EmbedTheme {
    return new URL(url).searchParams.get('theme') === 'dark' ? 'dark' : 'light';
}

/* The category inks from globals.css (--press-*), as hex: a standalone
   document gets none of the site's CSS variables. Keys match CATEGORY_INK in
   src/app/events/press.ts; a test keeps the two lists in step. */
export const CATEGORY_HEX: Record<string, string> = {
    Technology: '#2f3bff',
    Cultural: '#e8457e',
    Social: '#c2410c',
    Art: '#c98a00',
    Sports: '#12a150',
    Workshop: '#f06a00',
    Hackathon: '#7a3cff',
    Business: '#0e8a96',
};

const EVENT_SELECT = {
    id: true,
    title: true,
    date: true,
    venue: true,
    category: true,
    price: true,
} as const;

/**
 * The college or club and its next verified events, or null when no such
 * college or club exists. Both reads run together.
 */
export async function loadEmbedData(kind: EmbedKind, id: string, now: Date = new Date()): Promise<EmbedData | null> {
    const owner: Promise<{ id: string; name: string } | null> =
        kind === 'college'
            ? prisma.college.findUnique({ where: { id }, select: { id: true, name: true } })
            : prisma.club.findFirst({ where: { id, deletedAt: null }, select: { id: true, name: true } });

    const [found, events] = await Promise.all([
        owner,
        prisma.event.findMany({
            where: {
                ...(kind === 'college' ? { hostCollegeId: id } : { clubId: id }),
                verified: true,
                deletedAt: null,
                date: { gte: now },
            },
            orderBy: { date: 'asc' },
            take: EMBED_LIMIT,
            select: EVENT_SELECT,
        }),
    ]);

    if (!found) return null;
    return { kind, id: found.id, name: found.name, events };
}

/* ── Rendering ─────────────────────────────────────────────────────────── */

const rupees = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

function priceText(price: number) {
    return price > 0 ? `₹${rupees.format(price)}` : 'Free';
}

function ownerPath(kind: EmbedKind, id: string) {
    return `${SITE_URL}/${kind === 'college' ? 'colleges' : 'clubs'}/${encodeURIComponent(id)}?ref=embed`;
}

const BOARD_URL = `${SITE_URL}/events?ref=embed`;

/* The site's colours as hex values: no CSS variable from globals.css reaches a
   standalone page, so the tokens are copied here (canvas, paper, obsidian,
   felt, ash, accent, hairline, dot grid). The dark theme follows the site's
   rule that the blue focus ring turns paper-white on dark. */
const STYLES = `
:root{--bg:#ffffff;--ink:#111114;--soft:#5f5f68;--meta:#6c6c75;--line:rgba(17,17,20,.1);--dash:rgba(17,17,20,.24);--hover:#f5f4f0;--link:#2f3bff;--ring:#2f3bff;--dot:rgba(17,17,20,.13)}
html.dark{--bg:#111114;--ink:#ffffff;--soft:rgba(255,255,255,.76);--meta:rgba(255,255,255,.68);--line:rgba(255,255,255,.16);--dash:rgba(255,255,255,.3);--hover:rgba(255,255,255,.06);--link:#ffffff;--ring:#ffffff;--dot:rgba(255,255,255,.14)}
*{box-sizing:border-box}
html,body{margin:0;background:transparent}
body{font:14px/1.45 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:var(--ink);-webkit-font-smoothing:antialiased;text-size-adjust:100%}
a:focus-visible{outline:2px solid var(--ring);outline-offset:-2px}
.card{background:var(--bg);border:1px solid var(--line);border-radius:16px;overflow:hidden}
.head{padding:16px 18px 12px;border-bottom:1px solid var(--line)}
.label,.when,.foot{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--meta)}
.label{margin:0 0 4px}
h1{margin:0;font-size:20px;font-weight:700;line-height:1.05;letter-spacing:-.02em;overflow-wrap:anywhere}
.list{list-style:none;margin:0;padding:0}
.list li+li{border-top:1px solid var(--line)}
.ev{display:grid;grid-template-columns:4.75rem minmax(0,1fr);gap:4px 14px;padding:12px 18px;color:inherit;text-decoration:none}
.ev:hover{background:var(--hover)}
.ev:hover .title{text-decoration:underline;text-underline-offset:3px}
.when{display:flex;flex-direction:column;gap:2px;padding-top:2px;font-variant-numeric:tabular-nums}
.day{color:var(--ink);font-weight:600}
.title{display:block;font-size:15px;font-weight:600;line-height:1.25;letter-spacing:-.01em;overflow-wrap:anywhere}
.venue{display:block;margin-top:2px;font-size:13px;color:var(--soft);overflow-wrap:anywhere}
.tags{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:6px;font-size:12px;color:var(--soft)}
.cat{display:inline-flex;align-items:center;gap:6px}
.sq{flex:none;width:8px;height:8px;border-radius:2px;background:var(--ink)}
.price{font-variant-numeric:tabular-nums}
.empty{margin:14px;padding:24px 16px;border:1.5px dashed var(--dash);border-radius:12px;background-color:var(--bg);background-image:radial-gradient(var(--dot) 1px,transparent 1.2px);background-size:18px 18px;text-align:center}
.empty-title{margin:0 0 4px;font-size:17px;font-weight:700;line-height:1.1;letter-spacing:-.02em}
.empty-text{margin:0 auto 12px;max-width:34ch;color:var(--soft)}
.link{color:var(--link);font-weight:600;text-underline-offset:3px}
.link:hover{text-decoration-thickness:2px}
.foot{padding:10px 18px;border-top:1px solid var(--line)}
.foot a{color:var(--meta);text-decoration:none}
.foot a:hover{color:var(--ink);text-decoration:underline;text-underline-offset:3px}
@media (max-width:359px){.head{padding:14px 14px 10px}.ev{grid-template-columns:minmax(0,1fr);padding:12px 14px}.when{flex-direction:row;flex-wrap:wrap;gap:0 8px}.foot{padding:10px 14px}.empty{margin:10px}}
@media (prefers-reduced-motion:no-preference){.ev{transition:background-color .18s cubic-bezier(.22,1,.36,1)}}
`;

/* Tells the page around the iframe how tall the widget is, so public/embed.js
   (and the preview on the site) can size the frame with no inner scrollbar.
   '*' is safe: the message carries a number and nothing else. */
const HEIGHT_SCRIPT = `(function(){if(window.parent===window)return;var last=0;function send(){var h=Math.ceil(document.documentElement.getBoundingClientRect().height);if(h===last)return;last=h;window.parent.postMessage({type:'campus-connect:height',height:h},'*');}window.addEventListener('load',send);window.addEventListener('resize',send);if(window.ResizeObserver)new ResizeObserver(send).observe(document.documentElement);send();})();`;

function documentHtml({ title, theme, body }: { title: string; theme: EmbedTheme; body: string }) {
    return `<!doctype html>
<html lang="en-IN" class="${theme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)}</title>
<style>${STYLES}</style>
</head>
<body>
<main class="card">
${body}
</main>
<script>${HEIGHT_SCRIPT}</script>
</body>
</html>`;
}

const external = 'target="_blank" rel="noopener"';

function eventItem(event: EmbedEvent, now: Date) {
    const sameYear = formatIST(event.date, { year: 'numeric' }) === formatIST(now, { year: 'numeric' });
    const day = formatIST(event.date, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        ...(sameYear ? {} : { year: 'numeric' }),
    });
    const time = formatIST(event.date, { hour: 'numeric', minute: '2-digit' });
    const hex = CATEGORY_HEX[event.category];
    const href = `${SITE_URL}/events/${encodeURIComponent(event.id)}?ref=embed`;

    return `<li><a class="ev" href="${escapeHtml(href)}" ${external}>
<time class="when" datetime="${event.date.toISOString()}"><span class="day">${escapeHtml(day)}</span><span>${escapeHtml(time)}</span></time>
<span><span class="title">${escapeHtml(event.title)}</span><span class="venue">${escapeHtml(event.venue)}</span><span class="tags"><span class="cat"><span class="sq"${hex ? ` style="background:${hex}"` : ''} aria-hidden="true"></span>${escapeHtml(event.category)}</span><span class="price">${escapeHtml(priceText(event.price))}</span></span></span>
</a></li>`;
}

function emptyState(data: EmbedData) {
    const line =
        data.kind === 'college'
            ? `When a club at ${escapeHtml(data.name)} posts an event, it will show here.`
            : `When ${escapeHtml(data.name)} posts an event, it will show here.`;
    return `<div class="empty">
<p class="empty-title">Nothing coming up</p>
<p class="empty-text">${line}</p>
<a class="link" href="${escapeHtml(BOARD_URL)}" ${external}>See events across campuses</a>
</div>`;
}

/** The widget: header, up to ten events (or the empty state), footer link. */
export function renderEmbed(data: EmbedData, theme: EmbedTheme, now: Date = new Date()): string {
    const list = data.events.length
        ? `<ol class="list">${data.events.map((e) => eventItem(e, now)).join('')}</ol>`
        : emptyState(data);

    return documentHtml({
        title: `Upcoming events at ${data.name} · Campus Connect`,
        theme,
        body: `<header class="head"><p class="label">Upcoming events</p><h1>${escapeHtml(data.name)}</h1></header>
${list}
<footer class="foot"><a href="${escapeHtml(ownerPath(data.kind, data.id))}" ${external}>Events on Campus Connect <span aria-hidden="true">↗</span></a></footer>`,
    });
}

function messagePage(theme: EmbedTheme, title: string, text: string) {
    return documentHtml({
        title: `${title} · Campus Connect`,
        theme,
        body: `<div class="empty">
<p class="empty-title">${escapeHtml(title)}</p>
<p class="empty-text">${escapeHtml(text)}</p>
<a class="link" href="${escapeHtml(BOARD_URL)}" ${external}>Browse events on Campus Connect</a>
</div>`,
    });
}

export function renderNotFound(kind: EmbedKind, theme: EmbedTheme): string {
    return messagePage(
        theme,
        `This ${kind} is not on Campus Connect`,
        `The code on this page points to a ${kind} that does not exist or was removed. Copy the code again from its page on Campus Connect.`,
    );
}

export function renderUnavailable(theme: EmbedTheme): string {
    return messagePage(theme, 'Events could not load', 'Campus Connect did not answer in time. Reload the page in a minute to try again.');
}

/* ── Response ──────────────────────────────────────────────────────────── */

const CACHE_OK = 'public, s-maxage=300, stale-while-revalidate=600';
const CACHE_MISSING = 'public, s-maxage=60, stale-while-revalidate=300';

function html(body: string, status: number, cacheControl: string) {
    return new Response(body, {
        status,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': cacheControl,
            /* The CDN keeps one copy per theme and ignores any other query
               string a host page adds, so ?theme=dark never serves the light
               copy (or the reverse). */
            'Netlify-Vary': 'query=theme',
        },
    });
}

/** The whole GET for /embed/college/[id] and /embed/club/[id]. */
export async function embedResponse(kind: EmbedKind, id: string, url: string): Promise<Response> {
    const theme = themeFrom(url);
    if (!VALID_ID.test(id)) return html(renderNotFound(kind, theme), 404, CACHE_MISSING);

    let data: EmbedData | null;
    try {
        data = await loadEmbedData(kind, id);
    } catch (error) {
        console.error('Embed: could not load events', { kind, id, error });
        return html(renderUnavailable(theme), 503, 'no-store');
    }

    if (!data) return html(renderNotFound(kind, theme), 404, CACHE_MISSING);
    return html(renderEmbed(data, theme), 200, CACHE_OK);
}
