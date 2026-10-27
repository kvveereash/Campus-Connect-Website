import { formatIST } from '@/lib/format';
import { escapeHtml } from '@/lib/sanitize';
import { SITE_NAME } from '@/lib/site';

/*
 * The Monday email itself, as HTML and plain text. Kept apart from the
 * sending (src/lib/digest.ts) so it can be rendered and tested on its own.
 *
 * Email clients read neither CSS variables nor stylesheets reliably, so the
 * styles are inline and the colours are the site's tokens from
 * src/app/globals.css written out as hex. The layout is a single table
 * column, which every client from Gmail to Outlook renders the same way.
 */

// The design tokens, as hex: email clients cannot resolve var(--…).
const CANVAS = '#f5f4f0'; // --color-canvas
const PAPER = '#ffffff'; // --color-paper
const OBSIDIAN = '#111114'; // --color-obsidian
const INKSTONE = '#2b2b31'; // --color-inkstone
const FELT = '#5f5f68'; // --color-felt
const ASH = '#6c6c75'; // --color-ash
const ACCENT = '#2f3bff'; // --color-accent
const HAIRLINE = '#e7e7e8'; // --border-hairline (rgba(17,17,20,0.1)) flattened onto paper

const SANS = "Inter, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO = "'Geist Mono', ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace";

/** One line in the email: an event and why it is there. */
export interface DigestItem {
    id: string;
    title: string;
    date: Date;
    venue: string;
    college: string;
    /** Short and specific: "You are going", "From Coding Club", "At your college". */
    reason: string;
    going: boolean;
}

export interface DigestEmailInput {
    name: string;
    items: DigestItem[];
    /** The site's address, without a trailing slash. */
    baseUrl: string;
    /** The page with the "Turn off" button (a GET there changes nothing). */
    unsubscribeUrl: string;
}

export interface RenderedDigest {
    subject: string;
    html: string;
    text: string;
}

const when = (date: Date) =>
    `${formatIST(date, { weekday: 'short', day: 'numeric', month: 'short' })}, ${formatIST(date, { hour: 'numeric', minute: '2-digit' })}`;

const eventUrl = (baseUrl: string, id: string) => `${baseUrl}/events/${encodeURIComponent(id)}?ref=digest`;

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? '';

function clip(text: string, max: number) {
    return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export function digestSubject(items: DigestItem[]) {
    const [first, ...rest] = items;
    if (!first) return `${SITE_NAME} this week`;
    const lead = first.going ? `This week: ${clip(first.title, 60)}` : `This week near you: ${clip(first.title, 50)}`;
    return rest.length > 0 ? `${lead} and ${rest.length} more` : lead;
}

function itemHtml(item: DigestItem, baseUrl: string) {
    const place = [item.venue, item.college].filter(Boolean).map(escapeHtml).join(' · ');
    return `
<tr><td style="padding:16px 0;border-top:1px solid ${HAIRLINE};">
  <p style="margin:0 0 4px;font-family:${MONO};font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:${ASH};">${escapeHtml(when(item.date))}</p>
  <p style="margin:0 0 4px;font-family:${SANS};font-size:17px;font-weight:600;line-height:1.3;"><a href="${escapeHtml(eventUrl(baseUrl, item.id))}" style="color:${OBSIDIAN};text-decoration:underline;text-decoration-color:${HAIRLINE};">${escapeHtml(item.title)}</a></p>
  <p style="margin:0;font-family:${SANS};font-size:14px;line-height:1.5;color:${INKSTONE};">${place}</p>
  <p style="margin:4px 0 0;font-family:${SANS};font-size:13px;line-height:1.5;color:${FELT};">${escapeHtml(item.reason)}</p>
</td></tr>`;
}

function sectionHtml(label: string, items: DigestItem[], baseUrl: string) {
    if (items.length === 0) return '';
    return `
<tr><td style="padding:28px 0 8px;font-family:${MONO};font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:${ASH};">${escapeHtml(label)}</td></tr>
${items.map((item) => itemHtml(item, baseUrl)).join('')}`;
}

function itemText(item: DigestItem, baseUrl: string) {
    const place = [item.venue, item.college].filter(Boolean).join(', ');
    return `${when(item.date)}\n${item.title}\n${place}\n${item.reason}\n${eventUrl(baseUrl, item.id)}`;
}

export function renderDigestEmail({ name, items, baseUrl, unsubscribeUrl }: DigestEmailInput): RenderedDigest {
    const going = items.filter((i) => i.going);
    const more = items.filter((i) => !i.going);
    const hello = firstName(name) ? `Hi ${firstName(name)},` : 'Hi,';
    const intro =
        going.length > 0
            ? 'Here is your week: what you are going to, then what else is on near you.'
            : 'Here is what is on this week at your college, the colleges you follow, your clubs and topics close to your interests.';
    const why =
        'You get this because you turned on the Monday email in your Campus Connect settings. It lists events at your college, colleges you follow and clubs you are in, plus events in categories close to the interests on your profile.';
    const settingsUrl = `${baseUrl}/settings`;

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(SITE_NAME)} this week</title>
</head>
<body style="margin:0;padding:0;background:${CANVAS};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(`${items.length} ${items.length === 1 ? 'event' : 'events'} this week`)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CANVAS};">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${PAPER};border:1px solid ${HAIRLINE};border-radius:16px;">
  <tr><td style="padding:32px 28px 28px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="font-family:${MONO};font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:${ACCENT};">${escapeHtml(SITE_NAME)}</td></tr>
    <tr><td style="padding-top:12px;font-family:${SANS};font-size:26px;font-weight:700;line-height:1.1;letter-spacing:-0.02em;color:${OBSIDIAN};">This week</td></tr>
    <tr><td style="padding-top:16px;font-family:${SANS};font-size:15px;line-height:1.6;color:${INKSTONE};">${escapeHtml(hello)}<br>${escapeHtml(intro)}</td></tr>
    ${sectionHtml('You are going', going, baseUrl)}
    ${sectionHtml(going.length > 0 ? 'Also this week' : 'On this week', more, baseUrl)}
    <tr><td style="padding-top:24px;border-top:1px solid ${HAIRLINE};">
      <a href="${escapeHtml(`${baseUrl}/events?ref=digest`)}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:${ACCENT};color:${PAPER};font-family:${SANS};font-size:15px;font-weight:600;text-decoration:none;">See every event</a>
    </td></tr>
    </table>
  </td></tr>
  </table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
  <tr><td style="padding:20px 28px 0;font-family:${SANS};font-size:12px;line-height:1.6;color:${FELT};">
    ${escapeHtml(why)}<br>
    <a href="${escapeHtml(unsubscribeUrl)}" style="color:${FELT};text-decoration:underline;">Unsubscribe</a>
    &nbsp;·&nbsp;
    <a href="${escapeHtml(settingsUrl)}" style="color:${FELT};text-decoration:underline;">Settings</a>
  </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

    const sections: string[] = [];
    if (going.length > 0) sections.push(`YOU ARE GOING\n\n${going.map((i) => itemText(i, baseUrl)).join('\n\n')}`);
    if (more.length > 0) {
        const label = going.length > 0 ? 'ALSO THIS WEEK' : 'ON THIS WEEK';
        sections.push(`${label}\n\n${more.map((i) => itemText(i, baseUrl)).join('\n\n')}`);
    }

    const text = [
        `${SITE_NAME}: this week`,
        `${hello}\n${intro}`,
        ...sections,
        `See every event: ${baseUrl}/events?ref=digest`,
        '--',
        why,
        `Unsubscribe: ${unsubscribeUrl}`,
        `Settings: ${settingsUrl}`,
    ].join('\n\n');

    return { subject: digestSubject(items), html, text };
}
