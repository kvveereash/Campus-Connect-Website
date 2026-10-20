'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function FloatingChatButton() {
    const pathname = usePathname();
    const { user } = useAuth();

    // Messages need an account, so a signed-out visitor would only be bounced
    // to the login page. And there is no point offering it on /messages itself.
    if (!user || pathname.startsWith('/messages')) return null;

    return (
        <Link href="/messages" className="floating-chat" aria-label="Messages">
            <MessageCircle size={22} strokeWidth={2} aria-hidden="true" />
        </Link>
    );
}
