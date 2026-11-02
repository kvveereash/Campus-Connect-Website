// Switzer, the body face, is free under ITF's Free Font License. The licence
// allows self-hosting it on our own site but not redistributing it through
// a public repository, so it is not committed. Before each build (and dev
// server) this downloads the official package from Fontshare and keeps the
// one file the site uses, plus the licence, in a git-ignored folder.
//
// Run by `npm run build` and `npm run dev` (prebuild / predev). Does nothing
// when the files are already there.

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

const SOURCE = 'https://api.fontshare.com/v2/fonts/download/switzer';
const OUT = new URL('../src/app/fonts/switzer/', import.meta.url);
const WANT = {
    'Switzer_Complete/Fonts/WEB/fonts/Switzer-Variable.woff2': 'Switzer-Variable.woff2',
    'Switzer_Complete/License/FFL.txt': 'FFL.txt',
};

const missing = Object.values(WANT).filter((name) => !existsSync(new URL(name, OUT)));
if (missing.length === 0) process.exit(0);

async function download() {
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const res = await fetch(SOURCE, { signal: AbortSignal.timeout(60_000) });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return Buffer.from(await res.arrayBuffer());
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError;
}

/** The named entries of a zip archive, read from its central directory. */
function unzip(zip, names) {
    // The end-of-central-directory record sits in the last 64 KB.
    let end = -1;
    for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65_557); i--) {
        if (zip.readUInt32LE(i) === 0x06054b50) {
            end = i;
            break;
        }
    }
    if (end < 0) throw new Error('not a zip file');

    const files = new Map();
    let at = zip.readUInt32LE(end + 16);
    for (let n = zip.readUInt16LE(end + 10); n > 0; n--) {
        if (zip.readUInt32LE(at) !== 0x02014b50) throw new Error('bad zip directory');
        const method = zip.readUInt16LE(at + 10);
        const size = zip.readUInt32LE(at + 20);
        const nameLength = zip.readUInt16LE(at + 28);
        const skip = nameLength + zip.readUInt16LE(at + 30) + zip.readUInt16LE(at + 32);
        const local = zip.readUInt32LE(at + 42);
        const name = zip.toString('utf8', at + 46, at + 46 + nameLength);
        if (names.includes(name)) {
            const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
            const data = zip.subarray(start, start + size);
            files.set(name, method === 8 ? inflateRawSync(data) : Buffer.from(data));
        }
        at += 46 + skip;
    }
    return files;
}

try {
    const files = unzip(await download(), Object.keys(WANT));
    mkdirSync(OUT, { recursive: true });
    for (const [entry, name] of Object.entries(WANT)) {
        const data = files.get(entry);
        if (!data) throw new Error(`${entry} is not in the Fontshare package any more`);
        writeFileSync(new URL(name, OUT), data);
    }
    console.log('Fetched Switzer from Fontshare.');
} catch (error) {
    console.error(`Could not fetch Switzer from Fontshare (${error.message}). The build needs it: try again, or check ${SOURCE}.`);
    process.exit(1);
}
