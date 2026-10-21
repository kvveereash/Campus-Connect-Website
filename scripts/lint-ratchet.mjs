#!/usr/bin/env node
/**
 * The lint ratchet: lint errors may go down, never up.
 *
 * The codebase carries lint errors from before the standard was set (mostly
 * loose `any` types). Failing on every one of them would make the gate
 * useless until they are all fixed; ignoring them would let new ones in.
 * So the count per file is recorded in lint-baseline.json, and this fails
 * when any file has more errors than its baseline, or a file not in the
 * baseline has any at all.
 *
 *   npm run lint:ratchet           check against the baseline
 *   npm run lint:ratchet -- --update   record the current (lower) counts
 *
 * --update refuses to raise a count: fix the new error instead.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { relative, sep } from 'node:path';

const BASELINE = 'lint-baseline.json';
const update = process.argv.includes('--update');

function lint() {
    let out;
    try {
        out = execFileSync('npx', ['eslint', '-f', 'json', 'src'], {
            encoding: 'utf8',
            maxBuffer: 64 * 1024 * 1024,
            shell: process.platform === 'win32',
            stdio: ['ignore', 'pipe', 'ignore'],
        });
    } catch (error) {
        // ESLint exits 1 when it finds errors; the report is still on stdout.
        out = error.stdout;
        if (!out) throw error;
    }
    const counts = {};
    const details = {};
    for (const file of JSON.parse(out)) {
        const errors = file.messages.filter((m) => m.severity === 2);
        if (!errors.length) continue;
        const key = relative(process.cwd(), file.filePath).split(sep).join('/');
        counts[key] = errors.length;
        details[key] = errors.map((m) => `  ${key}:${m.line}:${m.column}  ${m.ruleId}  ${m.message.split('\n')[0]}`);
    }
    return { counts, details };
}

const { counts, details } = lint();
const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : {};
const total = (o) => Object.values(o).reduce((a, n) => a + n, 0);

const worse = Object.keys(counts).filter((f) => counts[f] > (baseline[f] ?? 0));
const better = Object.keys(baseline).filter((f) => (counts[f] ?? 0) < baseline[f]);

if (update) {
    // The very first run records the starting point; after that, a count
    // can only be lowered.
    if (worse.length && existsSync(BASELINE)) {
        console.error('Refusing to raise the baseline. These files gained lint errors; fix them instead:\n');
        for (const f of worse) console.error(details[f].join('\n'));
        process.exit(1);
    }
    const sorted = Object.fromEntries(Object.keys(counts).sort().map((k) => [k, counts[k]]));
    writeFileSync(BASELINE, JSON.stringify(sorted, null, 2) + '\n');
    console.log(`Baseline recorded: ${total(sorted)} errors in ${Object.keys(sorted).length} files.`);
    process.exit(0);
}

if (worse.length) {
    console.error('Lint errors went up. New errors are not allowed, even in files that already have some:\n');
    for (const f of worse) {
        console.error(`${f}: ${baseline[f] ?? 0} allowed, ${counts[f]} now`);
        console.error(details[f].join('\n') + '\n');
    }
    process.exit(1);
}

console.log(`Lint ratchet passed: ${total(counts)} errors, baseline ${total(baseline)}.`);
if (better.length) {
    console.log(`${better.length} file(s) improved. Lock it in with: npm run lint:ratchet -- --update`);
}
