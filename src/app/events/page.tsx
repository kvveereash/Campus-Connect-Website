import { Metadata } from 'next';
import EventsClient from './EventsClient';
import { getAllEvents } from '@/lib/actions';

export const metadata: Metadata = {
  title: 'Upcoming Events',
  description: 'Explore hackathons, fests, workshops, and cultural events happening across colleges.',
};

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const unresolvedParams = await searchParams;
  const search = (unresolvedParams?.search as string) || '';

  // Deliberately not passing `category` to the query. The filter rail shows a
  // count beside every category, and those counts have to describe the whole
  // set — filtering server-side first would collapse every count to the
  // selected category. The client applies the category from the URL instead,
  // which also keeps ?category= links shareable.
  const events = await getAllEvents({ search });

  return <EventsClient initialEvents={events} />;
}
