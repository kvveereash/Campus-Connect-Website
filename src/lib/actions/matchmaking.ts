'use server';

import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * Teammate suggestions for the signed-in user. Takes no id: it used to trust
 * one, so anyone (signed in or not) could list another user's college-mates
 * along with which of their private skills and interests overlapped.
 */
export async function getRecommendedTeammates() {
    const session = await getSession();
    if (!session?.userId) return [];
    const userId = session.userId as string;

    try {
        // Fix: Do not include scalar fields in `include` block unless they are relations
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                skills: true,
                interests: true,
                clubMemberships: {
                    include: {
                        club: true
                    }
                },
                badges: true
            }
        });

        if (!currentUser) return [];

        // Fetch other users
        const candidates = await prisma.user.findMany({
            where: {
                id: { not: userId },
                collegeId: currentUser.collegeId,
                // Deleted accounts were being recommended as teammates.
                deletedAt: null
            },
            // Named fields rather than a bare include, which returns every
            // column on User — password hash included — for fifty people, to
            // build a suggestion list that uses five of them.
            select: {
                id: true,
                name: true,
                department: true,
                year: true,
                bio: true,
                collegeId: true,
                skills: true,
                interests: true,
                badges: true
            },
            take: 50 // Limit pool for performance
        });

        // Scoring Logic
        const scoredCandidates = candidates.map(candidate => {
            let score = 0;
            const reasons: string[] = [];

            // 1. Interests Match (+5 per match)
            // Fix: ensure arrays exist
            const myInterests = currentUser.interests || [];
            const theirInterests = candidate.interests || [];

            const sharedInterests = theirInterests.filter(i =>
                myInterests.some(myI => myI.name === i.name)
            );
            if (sharedInterests.length > 0) {
                score += sharedInterests.length * 5;
                reasons.push(`${sharedInterests.length} shared interests`);
            }

            // 2. Skills Match (+2 per match - networking)
            // (In future we can check for complementary skills)
            const mySkills = currentUser.skills || [];
            const theirSkills = candidate.skills || [];

            const sharedSkills = theirSkills.filter(s =>
                mySkills.some(myS => myS.name === s.name)
            );
            if (sharedSkills.length > 0) {
                score += sharedSkills.length * 2;
                reasons.push(`${sharedSkills.length} shared skills`);
            }

            // 3. College Match (+3)
            if (candidate.collegeId === currentUser.collegeId) {
                score += 3;
                reasons.push('Same College');
            }

            // 4. Activity/Badges (+1 per badge)
            if (candidate.badges.length > 0) {
                score += candidate.badges.length;
                reasons.push('Active Participant');
            }

            return {
                id: candidate.id,
                name: candidate.name,
                department: candidate.department,
                year: candidate.year,
                bio: candidate.bio,
                avatar: candidate.name.charAt(0).toUpperCase(),
                skills: theirSkills.map((s) => s.name),
                score,
                matchReasons: reasons,
            };
        });

        /* The page renders a flat card per match: name, skills, a percentage
           and the reasons. This used to return { user, score, reasons }, so
           the page read `match.skills` as undefined and crashed the moment
           anyone had a college-mate to suggest. The percentage is relative
           to the strongest match, which is the only scale the score has. */
        const best = Math.max(1, ...scoredCandidates.map((c) => c.score));
        return scoredCandidates
            .sort((a, b) => b.score - a.score)
            .map(({ score, ...c }) => ({ ...c, matchScore: Math.round((score / best) * 100) }));

    } catch (error) {
        console.error('Matchmaking failed:', error);
        return [];
    }
}
