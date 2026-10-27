import { NextResponse } from 'next/server';
import { readDigestUnsubscribeToken } from '@/lib/ticket';
import { unsubscribeFromDigest } from '@/lib/digest';

/*
 * Turning the weekly digest off, by POST only. Two callers:
 *
 * - Mail providers, for the List-Unsubscribe-Post header (RFC 8058). Gmail's
 *   own "Unsubscribe" button POSTs `List-Unsubscribe=One-Click` here and
 *   expects a 2xx, nothing more.
 * - The button on /digest/unsubscribe/[token], a plain form, so it works
 *   without JavaScript. It sends `from=page` and is redirected back there,
 *   where the page now reads "off".
 *
 * There is deliberately no GET: link scanners in mail systems open every
 * link in an email, and must not be able to unsubscribe anyone.
 * The signed token is the only credential; it names one person and only ever
 * turns their digest off.
 */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const userId = readDigestUnsubscribeToken(decodeURIComponent(token));

    let fromPage = false;
    try {
        fromPage = (await request.formData()).get('from') === 'page';
    } catch {
        // A one-click POST may carry no form body at all; that is fine.
    }

    if (!userId) {
        return fromPage
            ? NextResponse.redirect(new URL(`/digest/unsubscribe/${encodeURIComponent(token)}`, request.url), 303)
            : NextResponse.json({ error: 'This unsubscribe link is not valid.' }, { status: 404 });
    }

    await unsubscribeFromDigest(userId);

    return fromPage
        ? NextResponse.redirect(new URL(`/digest/unsubscribe/${encodeURIComponent(token)}`, request.url), 303)
        : NextResponse.json({ unsubscribed: true });
}
