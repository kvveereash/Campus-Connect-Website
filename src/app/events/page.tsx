import { Metadata } from 'next';
import EventsClient from './EventsClient';
import { getAllEvents } from '@/lib/actions';

export const metadata: Metadata = {
  title: 'Upcoming Events',
  description: 'Explore hackathons, fests, workshops, and cultural events happening across colleges.',
};

// Served from the CDN and rebuilt at most once a minute; publishing an event
// revalidates the events tag straight away. Nothing here depends on who is
// asking, so nothing needs to render per request.
export const revalidate = 60;

export default async function EventsPage() {
  // Deliberately not passing `category` to the query. The filter rail shows a
  // count beside every category, and those counts have to describe the whole
  // set — filtering server-side first would collapse every count to the
  // selected category. The client applies the category from the URL instead,
  // which also keeps ?category= links shareable.
  const events = await getAllEvents();

  // Read when the page is built; the key itself never reaches the browser.
  return <EventsClient initialEvents={events} canAsk={Boolean(process.env.ANTHROPIC_API_KEY)} />;
}
