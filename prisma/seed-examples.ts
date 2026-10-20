/**
 * Loads the full set of example data: colleges, students, clubs and events
 * (seed-dummy), club posts for Buzz (seed-buzz), then hackathons, members,
 * registrations and team-finder posts (seed-showcase).
 *
 *   npm run seed:examples -- --yes
 *
 * It writes example people and events into whatever DATABASE_URL points at,
 * so it names that database and does nothing without --yes. Every script is
 * safe to re-run. Set SEED_PASSWORD first if you want to sign in as the
 * example students; otherwise their passwords are random.
 */
import { execSync } from 'child_process';

try {
    process.loadEnvFile('.env');
} catch {
    // No .env: rely on the environment as it is.
}

/** The database host only. Never the full URL: it carries the password. */
function dbHost() {
    try {
        return new URL(process.env.DATABASE_URL ?? '').host || '(DATABASE_URL not set)';
    } catch {
        return '(DATABASE_URL unreadable)';
    }
}

const target = dbHost();

if (!process.argv.includes('--yes')) {
    console.log(`This will write example colleges, students, clubs, events and posts into: ${target}`);
    console.log('Run again with --yes to go ahead:  npm run seed:examples -- --yes');
    process.exit(1);
}

console.log(`Seeding examples into ${target}\n`);
const env = { ...process.env, SEED_EXAMPLES: '1' };
for (const script of ['seed-dummy.ts', 'seed-buzz.ts', 'seed-showcase.ts']) {
    execSync(`npx tsx prisma/${script}`, { stdio: 'inherit', env });
}
