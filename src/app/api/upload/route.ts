import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { getSession } from '@/lib/auth';
import { checkRateLimit, getRateLimitIdentifier, uploadLimiter } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { isObjectStorageConfigured, StorageUploadError, uploadObject } from '@/lib/storage';

/**
 * File upload endpoint.
 *
 * Files go to Supabase Storage when it is configured (see lib/storage.ts);
 * that is required in production. In development, without it, they are
 * written to public/uploads.
 */

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Allowed types, each pinned to the extensions we will actually write.
 * A browser-supplied MIME type is attacker-controlled, so the extension we
 * save under comes from this table — never from the uploaded filename.
 */
const ALLOWED_TYPES: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
    'text/plain': '.txt',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

export async function POST(request: NextRequest) {
    // 1. Authentication — uploads write to disk, so never allow anonymous callers.
    const session = await getSession();
    if (!session?.userId) {
        return NextResponse.json(
            { success: false, error: 'You must be logged in to upload files' },
            { status: 401 }
        );
    }

    // 2. Rate limit per user.
    const identifier = getRateLimitIdentifier(session.userId as string);
    const rateLimit = await checkRateLimit(uploadLimiter, identifier);
    if (!rateLimit.success) {
        return NextResponse.json(
            { success: false, error: 'Too many uploads. Please try again later.' },
            { status: 429 }
        );
    }

    const data = await request.formData();
    const file = data.get('file');

    if (!(file instanceof File)) {
        return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    // 3. Size limit — checked before the bytes are pulled into memory.
    if (file.size === 0) {
        return NextResponse.json({ success: false, error: 'File is empty' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
            { success: false, error: 'File is too large. Maximum size is 5MB.' },
            { status: 413 }
        );
    }

    // 4. Type allowlist. The previous `file.type.startsWith('image/')` escape
    //    hatch let any made-up image/* subtype through, so it is gone.
    const extension = ALLOWED_TYPES[file.type];
    if (!extension) {
        return NextResponse.json(
            {
                success: false,
                error: 'File type not supported. Allowed: images, PDF, Word, plain text.',
            },
            { status: 400 }
        );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 5. Build the filename ourselves. A random name plus a known-good extension
    //    means a hostile upload cannot pick its own path or its own file type.
    const filename = `${Date.now()}-${randomUUID()}${extension}`;

    // 6a. Durable storage when it is configured: the only option that works
    //     in production.
    if (isObjectStorageConfigured()) {
        try {
            const url = await uploadObject(filename, buffer, file.type);
            return NextResponse.json({ success: true, url, message: 'File uploaded successfully' });
        } catch (error) {
            logger.error('Upload to object storage failed', error as Error, {
                userId: session.userId as string,
                status: error instanceof StorageUploadError ? error.status : undefined,
            });
            return NextResponse.json(
                { success: false, error: 'Upload failed. Please try again.' },
                { status: 502 }
            );
        }
    }

    /* 6b. Without it, production has nowhere to put the file. Writing into
     *     public/ cannot work there: on Netlify the function filesystem is
     *     read-only, and on a long-lived `next start` Next serves only the
     *     public/ files that existed at startup, so the new file would 404.
     *     Say so plainly (503: the request was fine, the server is not set
     *     up for it) rather than "Upload failed". */
    if (process.env.NODE_ENV === 'production') {
        logger.error('Upload rejected: object storage is not configured', undefined, {
            userId: session.userId as string,
        });
        return NextResponse.json(
            {
                success: false,
                error:
                    'Uploads are not available on this deployment: no file storage is configured. Paste an image URL instead.',
            },
            { status: 503 }
        );
    }

    // 6c. Development: public/uploads, which `next dev` serves as files appear.
    const uploadsPath = path.join(process.cwd(), 'public', 'uploads');
    const filePath = path.join(uploadsPath, filename);

    try {
        await mkdir(uploadsPath, { recursive: true });
        await writeFile(filePath, buffer);

        return NextResponse.json({
            success: true,
            url: `/uploads/${filename}`,
            message: 'File uploaded successfully',
        });
    } catch (error) {
        logger.error('Upload failed', error as Error, { userId: session.userId as string });
        return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
    }
}
