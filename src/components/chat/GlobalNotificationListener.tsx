'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { pusherClient } from '@/lib/pusher';
import { toast } from 'sonner';
import { usePathname, useRouter } from 'next/navigation';

export function GlobalNotificationListener() {
    const { user } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (!user?.id) return;

        const channel = pusherClient.subscribe(`user-${user.id}`);

        channel.bind('new-notification', (data: { title: string, body: string, link: string }) => {
            // Don't show toast if already on that page
            if (pathname === data.link) return;

            toast.message(data.title, {
                description: data.body,
                action: {
                    label: 'View',
                    onClick: () => router.push(data.link)
                }
            });
        });

        return () => {
            pusherClient.unsubscribe(`user-${user.id}`);
        };
    }, [user?.id, pathname, router]);

    return null; // Logic only
}
