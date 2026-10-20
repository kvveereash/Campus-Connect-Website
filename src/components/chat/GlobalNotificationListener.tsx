'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { pusherClient } from '@/lib/pusher-client';
import { userChannel } from '@/lib/pusher-channels';
import { toast } from 'sonner';
import { usePathname, useRouter } from 'next/navigation';

type IncomingNotification = {
    message: string;
    link: string;
    actor?: { name?: string | null } | null;
};

export function GlobalNotificationListener() {
    const { user } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    // Read through a ref so a navigation does not re-run the subscription
    // effect. It used to depend on pathname, and its cleanup unsubscribed the
    // channel on every navigation, taking NotificationBell's binding with it.
    const pathnameRef = useRef(pathname);
    useEffect(() => {
        pathnameRef.current = pathname;
    }, [pathname]);

    useEffect(() => {
        if (!user?.id) return;

        const channel = pusherClient.subscribe(userChannel(user.id));

        // The server sends 'notification:new'. This listened for
        // 'new-notification', which nothing sent, so the toast never fired.
        const onNotification = (data: IncomingNotification) => {
            // Don't show toast if already on that page
            if (pathnameRef.current === data.link) return;

            toast.message(data.actor?.name ? `${data.actor.name} ${data.message}` : data.message, {
                action: {
                    label: 'View',
                    onClick: () => router.push(data.link)
                }
            });
        };
        channel.bind('notification:new', onNotification);

        return () => {
            channel.unbind('notification:new', onNotification);
        };
    }, [user?.id, router]);

    return null; // Logic only
}
