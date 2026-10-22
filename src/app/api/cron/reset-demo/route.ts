import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { refuseUnlessCron } from '@/lib/cron';
import { resetDemo } from '@/lib/demo';

// Nightly, from netlify/functions/reset-demo.mjs: puts the shared demo
// account back to its starting state, whatever visitors did with it.
export async function POST(request: Request) {
    const refused = refuseUnlessCron(request);
    if (refused) return refused;

    const result = await resetDemo();
    logger.info('Demo account reset', result);
    return NextResponse.json({ reset: true });
}
