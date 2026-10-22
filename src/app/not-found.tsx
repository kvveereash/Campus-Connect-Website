import Link from 'next/link';
import ProblemPage from '@/components/ProblemPage';

export default function NotFound() {
    return (
        <ProblemPage
            kicker="404 · Not on the board"
            title={
                <>
                    Nothing pinned <em className="accent">here.</em>
                </>
            }
            text="The link may be out of date, or the event, club or profile has been taken down."
            actions={
                <>
                    <Link href="/events" className="btn btn-primary">
                        Browse events
                    </Link>
                    <Link href="/" className="btn btn-outline">
                        Go home
                    </Link>
                </>
            }
        />
    );
}
