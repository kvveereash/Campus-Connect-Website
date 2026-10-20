import 'server-only';

/**
 * Durable file storage: Supabase Storage, over its REST API.
 *
 * Uploads used to be written to public/uploads, which cannot work in
 * production. Netlify functions have a read-only filesystem, so every write
 * failed, and even on a long-lived `next start` Next serves only the public/
 * files that existed when the server started, so a new upload 404'd.
 *
 * Configured by three variables (all server-side; the service-role key must
 * never reach the browser):
 *   SUPABASE_URL              https://<project>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY service-role key, used only for the upload call
 *   SUPABASE_STORAGE_BUCKET   a *public* bucket, so files are readable by URL
 *
 * Plain fetch rather than @supabase/supabase-js: one POST does not justify a
 * client library, and nothing else in the app talks to Supabase this way.
 */

interface StorageConfig {
    url: string;
    key: string;
    bucket: string;
}

function readConfig(): StorageConfig | null {
    const url = process.env.SUPABASE_URL?.replace(/\/+$/, '');
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET;
    if (!url || !key || !bucket) return null;
    return { url, key, bucket };
}

export function isObjectStorageConfigured(): boolean {
    return readConfig() !== null;
}

/**
 * Where this bucket's files are served from, e.g.
 * https://abc.supabase.co/storage/v1/object/public/uploads/
 * Null when storage is not configured.
 */
export function publicObjectUrlPrefix(): string | null {
    const config = readConfig();
    if (!config) return null;
    return `${config.url}/storage/v1/object/public/${encodeURIComponent(config.bucket)}/`;
}

export class StorageUploadError extends Error {
    constructor(message: string, readonly status?: number) {
        super(message);
        this.name = 'StorageUploadError';
    }
}

/**
 * Store a file and return its public URL.
 *
 * `objectName` must be built by the caller from trusted parts (the upload
 * route uses a timestamp, a UUID and an extension from its allowlist). It is
 * never derived from the uploaded filename.
 */
export async function uploadObject(objectName: string, body: Buffer, contentType: string): Promise<string> {
    const config = readConfig();
    if (!config) throw new StorageUploadError('Object storage is not configured');
    if (!/^[\w.-]+$/.test(objectName)) throw new StorageUploadError('Invalid object name');

    const bucket = encodeURIComponent(config.bucket);
    const response = await fetch(`${config.url}/storage/v1/object/${bucket}/${objectName}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${config.key}`,
            apikey: config.key,
            'Content-Type': contentType,
            // Names are unique; refuse rather than silently replace a file.
            'x-upsert': 'false',
            // Objects never change after upload.
            'cache-control': 'max-age=31536000',
        },
        body: new Uint8Array(body),
    });

    if (!response.ok) {
        // The body is Supabase's error JSON. Logged by the caller, never sent
        // to the browser.
        const detail = await response.text().catch(() => '');
        throw new StorageUploadError(`Storage upload failed (${response.status}): ${detail.slice(0, 300)}`, response.status);
    }

    return `${publicObjectUrlPrefix()}${objectName}`;
}
