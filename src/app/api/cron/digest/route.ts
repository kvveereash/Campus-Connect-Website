import { NextResponse } from 'next/server';
import { refuseUnlessCron } from '@/lib/cron';
import { runDigestBatch } from '@/lib/digest';

/*
 * The Monday digest. netlify/functions/weekly-digest.mjs calls this with
 * CRON_SECRET at 08:00 IST and keeps calling while the answer says `more`;
 * each call sends one bounded batch (src/lib/digest.ts), so no single call
 * runs into the function time limit.
 */
export async function POST(request: Request) {
    const refused = refuseUnlessCron(request);
    if (refused) return refused;
    return NextResponse.json(await runDigestBatch());
}
