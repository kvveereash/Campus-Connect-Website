/*
 * Closes the old seed-password hole and sets who is an admin. Run by the
 * owner against the database in .env:
 *
 *   node scripts/secure-accounts.mjs                       list accounts that accept a known password
 *   node scripts/secure-accounts.mjs --apply               give each of them a random password nobody holds
 *   node scripts/secure-accounts.mjs --admin you@mail.com  make that one account an admin
 *
 * Seed scripts before Oct 2026 gave every account "password123", and that
 * string is in the repository's history, so those accounts (one of them the
 * only admin) could be signed into by anyone. A reset ends their sessions
 * too: a session carries a fingerprint of the password hash. Nothing is
 * printed but emails.
 *
 * Replaces make-admin.ts (promoted whichever user came first) and
 * promote-admin.ts (a hard-coded address).
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

const KNOWN_PASSWORDS = ['password123'];
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const adminIndex = args.indexOf('--admin');
const adminEmail = adminIndex >= 0 ? args[adminIndex + 1]?.trim().toLowerCase() : null;

const prisma = new PrismaClient();

async function knownPasswordAccounts() {
    const users = await prisma.user.findMany({
        where: { deletedAt: null },
        select: { id: true, email: true, role: true, password: true },
    });
    const weak = [];
    for (const user of users) {
        if (!user.password) continue;
        for (const guess of KNOWN_PASSWORDS) {
            if (await bcrypt.compare(guess, user.password)) {
                weak.push(user);
                break;
            }
        }
    }
    return { checked: users.length, weak };
}

async function main() {
    if (adminIndex >= 0) {
        if (!adminEmail) throw new Error('Give the email after --admin.');
        const user = await prisma.user.findUnique({ where: { email: adminEmail }, select: { id: true, role: true } });
        if (!user) throw new Error(`No account with the email ${adminEmail}.`);
        if (user.role === 'ADMIN') console.log(`${adminEmail} is already an admin.`);
        else {
            await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
            console.log(`${adminEmail} is now an admin.`);
        }
    }

    const { checked, weak } = await knownPasswordAccounts();
    console.log(`Checked ${checked} accounts; ${weak.length} accept a known password.`);
    for (const user of weak) console.log(`  ${user.email}${user.role === 'ADMIN' ? '  (ADMIN)' : ''}`);

    if (!apply) {
        if (weak.length) console.log('\nNothing changed. Run again with --apply to give these accounts random passwords.');
        return;
    }

    let reset = 0;
    for (const user of weak) {
        const hash = await bcrypt.hash(randomBytes(32).toString('base64url'), 10);
        // Only if the hash is still the one checked: never overwrite a password changed in the meantime.
        const result = await prisma.user.updateMany({ where: { id: user.id, password: user.password }, data: { password: hash } });
        reset += result.count;
    }
    console.log(`\nReset ${reset} of ${weak.length}. Their old sessions have ended.`);
}

main()
    .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
