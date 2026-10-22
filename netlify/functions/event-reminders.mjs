// Hourly, Netlify calls this, and it asks the site to send the day-before
// event reminders (src/app/api/cron/reminders/route.ts). The work runs in the
// site's own function, where Prisma and the email setup already are; this only
// knocks. Needs CRON_SECRET set in Netlify's environment variables, and runs
// on published deploys only (Netlify does not schedule previews).
export default async function eventReminders() {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        console.warn('event-reminders: CRON_SECRET is not set, so no reminders were sent.');
        return;
    }
    const res = await fetch(`${process.env.URL}/api/cron/reminders`, {
        method: 'POST',
        headers: { authorization: `Bearer ${secret}` },
    });
    console.log(`event-reminders: ${res.status} ${await res.text()}`);
}

export const config = { schedule: '@hourly' };
