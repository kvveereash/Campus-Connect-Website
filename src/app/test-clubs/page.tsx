
import prismadb from '@/lib/db';

export default async function DebugPage() {
    const clubs = await prismadb.club.findMany({
        include: { members: true, college: true }
    });

    return (
        <div style={{ padding: 40 }}>
            <h1>Debug Clubs</h1>
            <pre>{JSON.stringify(clubs, null, 2)}</pre>

            <h2>Club Members</h2>
            <pre>
                {JSON.stringify(await prismadb.clubMember.findMany(), null, 2)}
            </pre>
        </div>
    );
}
