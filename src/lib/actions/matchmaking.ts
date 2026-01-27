'use server';

import prisma from '@/lib/db';

export async function getRecommendedTeammates(userId: string) {
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
                collegeId: currentUser.collegeId
            },
            include: {
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
                user: {
                    id: candidate.id,
                    name: candidate.name,
                    department: candidate.department,
                    year: candidate.year,
                    bio: candidate.bio
                },
                score,
                reasons
            };
        });

        // Sort by score
        return scoredCandidates.sort((a, b) => b.score - a.score);

    } catch (error) {
        console.error('Matchmaking failed:', error);
        return [];
    }
}
