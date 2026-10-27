// Every Monday at 08:00 India time, asks the site to send the weekly digest
// email (src/app/api/cron/digest/route.ts). Each call to the site sends one
// batch and says whether there are more, so this keeps knocking until there
// are none or its own time is nearly up. Anyone still left waits for next
// Monday. Needs CRON_SECRET in Netlify's environment variables, like
// event-reminders.
// Scheduled functions stop at 30 seconds and one call to the site can take
// about 10, so no new call starts after 18.
const TIME_BUDGET_MS = 18_000;
const MAX_CALLS = 20;

export default async function weeklyDigest() {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        console.warn('weekly-digest: CRON_SECRET is not set, so no digest was sent.');
        return;
    }
    const started = Date.now();
    for (let call = 1; call <= MAX_CALLS && Date.now() - started < TIME_BUDGET_MS; call++) {
        const res = await fetch(`${process.env.URL}/api/cron/digest`, {
            method: 'POST',
            headers: { authorization: `Bearer ${secret}` },
        });
        const body = await res.text();
        console.log(`weekly-digest: call ${call}: ${res.status} ${body}`);
        let more = false;
        try {
            more = res.ok && JSON.parse(body).more === true;
        } catch {
            more = false;
        }
        if (!more) return;
    }
    console.warn('weekly-digest: stopped with people still to send to; they wait for next Monday.');
}

// 02:30 UTC on Monday is 08:00 IST.
export const config = { schedule: '30 2 * * 1' };
