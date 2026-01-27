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
  const category = (unresolvedParams?.category as string) || 'All';

  const events = await getAllEvents({ search, category });
  return <EventsClient initialEvents={events} />;
}
