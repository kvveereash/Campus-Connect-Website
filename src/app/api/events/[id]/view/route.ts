import { NextResponse } from 'next/server';
import { isBotUserAgent, recordView, SOURCES, type Source } from '@/lib/analytics';
import { SITE_URL } from '@/lib/site';
import { checkRateLimit, getClientIp, getRateLimitIdentifier, viewLimiter } from '@/lib/rate-limit';

/*
 * Counts one view of an event page, sent by ViewBeacon. It stores a number
 * against the event, the Indian day and the source, and nothing about the
 * person: the IP is used only for the rate limit, which keeps a script from
 * inflating an organiser's numbers.
 */

const MAX_BODY = 512;
const ID = /^[a-z0-9_-]{1,50}$/i;
const KNOWN = new Set<string>(SOURCES);

const done = () => new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });

/* sendBeacon posts cross-origin without asking, so another site could make
   its visitors count views here. A request that says where it came from
   must come from this site. */
function fromElsewhere(request: Request) {
    const origin = request.headers.get('origin');
    if (!origin) return false;
    try {
        const host = new URL(origin).host;
        const ours = [new URL(request.url).host, request.headers.get('host'), new URL(SITE_URL).host];
        return !ours.includes(host);
    } catch {
        return true;
    }
}

/* The source from the query string, or from a small JSON or form body.
   Absent means the visitor came straight here. */
async function readSource(request: Request): Promise<unknown> {
    const fromQuery = new URL(request.url).searchParams.get('source');
    if (fromQuery !== null) return fromQuery;

    if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY) return undefined;
    const text = (await request.text()).slice(0, MAX_BODY).trim();
    if (!text) return undefined;
    if (text.startsWith('{')) {
        try {
            const parsed: unknown = JSON.parse(text);
            return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>).source : undefined;
        } catch {
            return null;
        }
    }
    return new URLSearchParams(text).get('source') ?? undefined;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!ID.test(id)) return new NextResponse(null, { status: 404 });

    // Answered as if counted, so a bot learns nothing from the response.
    if (isBotUserAgent(request.headers.get('user-agent')) || fromElsewhere(request)) return done();

    const raw = await readSource(request);
    let source: Source = 'direct';
    if (raw !== undefined) {
        // The beacon only ever sends a known source; anything else is not ours.
        if (typeof raw !== 'string' || !KNOWN.has(raw)) return new NextResponse(null, { status: 400 });
        source = raw as Source;
    }

    const limit = await checkRateLimit(viewLimiter, getRateLimitIdentifier(undefined, await getClientIp()));
    if (!limit.success) return new NextResponse(null, { status: 429 });

    await recordView(id, source);
    return done();
}
