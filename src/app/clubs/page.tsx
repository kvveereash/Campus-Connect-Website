import { getClubs } from '@/lib/actions/clubs';
import ClubList from './ClubList';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';

export default async function ClubsPage() {
    const session = await getSession();
    const clubs = await getClubs();

    let joinedClubIds: string[] = [];
    let user = null;

    if (session?.userId) {
        user = session.user;

        try {
            const memberships = await prisma.clubMember.findMany({
                where: { userId: session.userId },
                select: { clubId: true }
            });
            joinedClubIds = memberships.map(m => m.clubId);
        } catch (error) {
            console.error("Failed to fetch user memberships", error);
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
