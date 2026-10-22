// Every night at 3:00 India time, puts the shared demo account behind
// "Try the demo" back to its starting state (src/app/api/cron/reset-demo).
// Needs CRON_SECRET in Netlify's environment variables, like event-reminders.
export default async function resetDemo() {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        console.warn('reset-demo: CRON_SECRET is not set, so the demo account was not reset.');
        return;
    }
    const res = await fetch(`${process.env.URL}/api/cron/reset-demo`, {
        method: 'POST',
        headers: { authorization: `Bearer ${secret}` },
    });
    console.log(`reset-demo: ${res.status} ${await res.text()}`);
}

// 21:30 UTC is 03:00 IST, when the fewest people are using it.
export const config = { schedule: '30 21 * * *' };
