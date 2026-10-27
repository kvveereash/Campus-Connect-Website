import 'server-only';
import prisma from '@/lib/db';
import { readQuestions } from '@/lib/recruitment-rules';

/**
 * Whether a club is recruiting, and its questions, for the club page.
 *
 * Read per request rather than added to the cached club details, so opening
 * or closing applications shows at once. Not a server action on purpose: the
 * page has already decided the viewer may see this club (unapproved clubs are
 * members-only), and an action would answer for any club id.
 */
export async function getClubRecruitment(clubId: string) {
    const club = await prisma.club.findUnique({
        where: { id: clubId },
        select: { recruiting: true, recruitQuestions: true },
    });
    return {
        recruiting: club?.recruiting ?? false,
        questions: readQuestions(club?.recruitQuestions),
    };
}
