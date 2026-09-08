import { Suspense } from 'react';
import { getClubs } from '@/lib/actions/clubs';
import ClubList from './ClubList';
import ClubListSkeleton from '@/components/ClubListSkeleton';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';

async function ClubsContent() {
    const session = await getSession();
    const clubs = await getClubs();

    let joinedClubIds: string[] = [];
    let user = null;

    if (session?.userId) {
        user = session.user;

        try {
            const memberships = await prisma.clubMember.findMany({
                where: { userId: session.userId },
                select: { clubId: true },
            });
            joinedClubIds = memberships.map((m) => m.clubId);
        } catch (error) {
            console.error('Failed to fetch user memberships', error);
        }
    }

    return (
        <ClubList
            initialClubs={clubs}
            user={user ? { ...user, id: session!.userId as string } : null}
            joinedClubIds={joinedClubIds}
        />
    );
}

export default function ClubsPage() {
    // Suspense here rather than a `loading.tsx` at this segment — see the note
    // in ClubListSkeleton for why that distinction matters for /clubs/[id].
    return (
        <Suspense fallback={<ClubListSkeleton />}>
            <ClubsContent />
        </Suspense>
    );
}
