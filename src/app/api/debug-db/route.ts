import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    const results: Record<string, any> = {};

    // Check if DATABASE_URL is set (masked)
    const dbUrl = process.env.DATABASE_URL;
    results.dbUrlSet = !!dbUrl;
    results.dbUrlMasked = dbUrl ? dbUrl.replace(/:[^@]+@/, ':***@') : 'NOT SET';

    // Test raw query
    try {
        const raw = await prisma.$queryRawUnsafe('SELECT 1 as ok');
        results.rawQuery = { success: true, result: raw };
    } catch (err: any) {
        results.rawQuery = { success: false, error: err.message, code: err.code };
    }

    // Count records
    try {
        const [colleges, clubs, events, users] = await Promise.all([
            prisma.college.count(),
            prisma.club.count(),
            prisma.event.count(),
            prisma.user.count(),
        ]);
        results.counts = { colleges, clubs, events, users };
    } catch (err: any) {
        results.counts = { error: err.message, code: err.code };
    }

    // Sample college names
    try {
        const colleges = await prisma.college.findMany({ select: { name: true }, take: 5 });
        results.sampleColleges = colleges.map(c => c.name);
    } catch (err: any) {
        results.sampleColleges = { error: err.message };
    }

    return NextResponse.json(results);
}
