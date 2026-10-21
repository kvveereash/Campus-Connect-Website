'use server';

import prisma from '@/lib/db';
import { revalidatePath, updateTag } from 'next/cache';
import bcrypt from 'bcryptjs';
import { createSession, deleteSession, getSession, passwordVersion } from '@/lib/auth';
import { ActionState } from '@/types';
import { authLimiter, signupLimiter, loginIpLimiter, signupIpLimiter, eventLimiter, getClientIp, getRateLimitIdentifier, checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { Prisma } from '@prisma/client';
import { updateUserProfileSchema, type UpdateUserProfileInput } from '@/lib/schemas';
import { z } from 'zod';

/* The signup form enforces these in the browser, but the action is a public
   endpoint: it used to accept a 1-character password and a name of any length
   (and the name goes into emails). 72 is bcrypt's input limit. */
const signupSchema = z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
    email: z.string().trim().toLowerCase().max(254).email('Enter a valid email address'),
    password: z.string().min(8, 'Use at least 8 characters').max(72, 'Use at most 72 characters'),
    department: z.string().trim().max(100).optional(),
    year: z.string().trim().max(20).optional(),
});

// Compared against when an address has no account, so a wrong address takes
// as long as a wrong password and response time does not reveal who exists.
// A bcrypt hash (cost 12) of a random throwaway string, precomputed so module
// load does not pay for hashing. It guards nothing; it only costs the same time.
const DUMMY_HASH = '$2b$12$lAZnhoTl8r7ZQnw71cWsXeA0vZk9MiFbPy4FPQqCR..2LDImS0p2S';

export async function signup(prevState: ActionState | null, formData: FormData): Promise<ActionState> {
    const field = (key: string) => {
        const value = formData.get(key);
        return typeof value === 'string' && value !== '' ? value : undefined;
    };
    const parsed = signupSchema.safeParse({
        name: field('name') ?? '',
        // Stored lower-cased so the same inbox cannot hold two accounts, and so
        // password reset (which looks addresses up lower-cased) can find it.
        email: field('email') ?? '',
        password: field('password') ?? '',
        department: field('department'),
        year: field('year'),
    });
    if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0]?.message ?? 'Missing required fields' };
    }
    const { name, email, password } = parsed.data;
    const department = parsed.data.department || 'General';
    const year = parsed.data.year || '1st Year';

    try {
        // Per address (3 an hour) and per client IP (20 an hour).
        const ip = await getClientIp();
        const [rateLimit, ipLimit] = await Promise.all([
            checkRateLimit(signupLimiter, `email:${email}`),
            checkRateLimit(signupIpLimiter, getRateLimitIdentifier(undefined, ip)),
        ]);

        if (!rateLimit.success || !ipLimit.success) {
            const resetTime = rateLimit.reset.toLocaleTimeString();
            return {
                success: false,
                error: `Too many signup attempts. Please try again at ${resetTime}.`
            };
        }

        // Case-insensitive: accounts created before emails were normalised
        // may still be stored with capitals.
        const existingUser = await prisma.user.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } },
            select: { id: true },
        });
        if (existingUser) {
            return { success: false, error: 'User already exists' };
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        // Assign a default college
        const defaultCollege = await prisma.college.findFirst();

        if (!defaultCollege) {
            logger.error('No college found in database', undefined, { email });
            return { success: false, error: 'System error: No colleges available. Please contact support.' };
        }

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                department,
                year,
                collegeId: defaultCollege.id
            }
        });

        await createSession(newUser.id, {
            role: 'USER',
            name: newUser.name,
            email: newUser.email,
            passwordVersion: passwordVersion(hashedPassword),
        });

        logger.auth('signup', newUser.id, { email, department, year, collegeId: defaultCollege.id });

        /* Send the confirmation link, but do not let it decide whether signup
           succeeded. The account exists and the session is already set; if the
           mail provider is down or unconfigured, the right outcome is a
           working account with an unconfirmed address — not a failed signup
           and a user with no idea whether to try again. The address can be
           confirmed later from settings. */
        try {
            const { issueVerificationEmail } = await import('@/lib/email-verification');
            await issueVerificationEmail(newUser.id);
        } catch (error) {
            logger.error('Signup succeeded but verification email failed', error as Error, {
                userId: newUser.id,
            });
        }

        return { success: true, message: 'Account created successfully' };

    } catch (error) {
        logger.error('Signup failed', error as Error, { email });
        console.error('Signup error details:', error);
        return { success: false, error: 'Failed to create account. Please try again.' };
    }
}

export async function login(prevState: ActionState | null, formData: FormData): Promise<ActionState> {
    const rawEmail = formData.get('email');
    const rawPassword = formData.get('password');
    const email = (typeof rawEmail === 'string' ? rawEmail : '').trim().toLowerCase();
    const password = typeof rawPassword === 'string' ? rawPassword : '';

    if (!email || !password || email.length > 254 || password.length > 200) {
        return { success: false, error: 'Missing email or password' };
    }

    try {
        /* Two limits. Per client IP (30 per 15 min) stops one machine trying a
           password against many addresses. Per IP *and* address (5 per 15 min)
           stops guessing one account. Keying the second on the address alone,
           as this did, let anyone lock any student out by failing five times
           with their email, so the old account-wide lockout is gone too: it
           was the same denial of service with a database write. */
        const ip = await getClientIp();
        const ipKey = getRateLimitIdentifier(undefined, ip);
        const [ipLimit, accountLimit] = await Promise.all([
            checkRateLimit(loginIpLimiter, ipKey),
            checkRateLimit(authLimiter, `${ipKey}:email:${email}`),
        ]);
        const blocked = !ipLimit.success ? ipLimit : !accountLimit.success ? accountLimit : null;

        if (blocked) {
            logger.rateLimit('login', ipKey, true, { email });
            return {
                success: false,
                error: `Too many login attempts. Please try again at ${blocked.reset.toLocaleTimeString()}.`
            };
        }

        /* deletedAt: null is load-bearing.
           This was findUnique({ where: { email } }) with no such check, so a
           soft-deleted account could still sign in — which would have made the
           new "delete my account" button a no-op dressed as a deletion. */
        const user = await prisma.user.findFirst({
            where: { email: { equals: email, mode: 'insensitive' }, deletedAt: null }
        });

        // Always run one bcrypt comparison, so an unknown address is not
        // answered measurably faster than a wrong password.
        const passwordMatch = await bcrypt.compare(password, user?.password || DUMMY_HASH);

        if (!user || !user.password || !passwordMatch) {
            // Kept for monitoring; it no longer locks the account.
            await prisma.loginAttempt.create({
                data: { id: crypto.randomUUID(), email, success: false, createdAt: new Date() }
            }).catch(() => undefined);
            if (user) logger.auth('failed', user.id, { email, reason: 'invalid_password' });
            return { success: false, error: 'Invalid credentials' };
        }

        // Clear a lock left over from the old lockout scheme.
        if (user.lockedUntil) {
            await prisma.user.update({
                where: { id: user.id },
                data: { lockedUntil: null }
            });
        }

        await createSession(user.id, {
            role: user.role,
            name: user.name,
            email: user.email,
            passwordVersion: passwordVersion(user.password),
        });

        logger.auth('login', user.id, { email });

        return { success: true, message: 'Logged in successfully' };

    } catch (error) {
        logger.error('Login failed', error as Error, { email });
        return { success: false, error: 'Something went wrong during login' };
    }
}

/**
 * Lightweight version for server actions that only need basic auth.
 * Use when you don't need relations like clubMemberships or registrations.
 * ~70% less data than getSessionUser - ideal for quick permission checks.
 */
export async function getSessionUserMinimal() {
    const session = await getSession();
    if (!session || !session.userId) return null;

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.userId as string },
            select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                role: true,
                collegeId: true
            }
        });

        return user;
    } catch (error) {
        console.error('Failed to get minimal session user:', error);
        return null;
    }
}

export async function logout() {
    await deleteSession();
    revalidatePath('/');
}

export async function getSessionUser() {
    const session = await getSession();
    if (!session || !session.userId) return null;

    try {
        // Optimized query using select for lighter payload
        const user = await prisma.user.findUnique({
            where: { id: session.userId as string },
            select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                role: true,
                collegeId: true,
                department: true,
                year: true,
                bio: true,
                resumeUrl: true,
                achievements: true,
                projects: true,
                portfolioLinks: true,
                createdAt: true,
                updatedAt: true,
                lastSeenAt: true,
                // Relations - only essential data
                college: {
                    select: {
                        id: true,
                        name: true,
                        logo: true,
                        location: true,
                        description: true
                    }
                },
                skills: {
                    select: { id: true, name: true }
                },
                interests: {
                    select: { id: true, name: true }
                },
                followedColleges: {
                    select: { id: true }
                },
                // Expanded selection for AuthContext compatibility
                badges: {
                    select: {
                        dateEarned: true,
                        badge: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                icon: true
                            }
                        }
                    }
                },
                registrations: {
                    select: {
                        id: true,
                        eventId: true,
                        status: true,
                        createdAt: true,
                        updatedAt: true
                    }
                },
                // Lighter club membership query
                clubMemberships: {
                    select: {
                        clubId: true,
                        role: true,
                        joinedAt: true,
                        club: {
                            select: {
                                id: true,
                                name: true,
                                logo: true,
                                description: true,
                                category: true,
                                collegeId: true,
                                createdAt: true,
                                updatedAt: true
                            }
                        }
                    }
                },
                // Badge count for display
                _count: {
                    select: { badges: true }
                }
            }
        });

        if (!user) return null;

        return {
            ...user,
            achievements: user.achievements ? JSON.parse(user.achievements) : [],
            projects: user.projects ? JSON.parse(user.projects) : [],
            portfolioLinks: user.portfolioLinks ? JSON.parse(user.portfolioLinks) : [],
            skills: user.skills.map(s => s.name),
            interests: user.interests.map(i => i.name),
            followedColleges: user.followedColleges.map(c => c.id)
        };
    } catch (error) {
        console.error('Failed to get session user:', error);
        return null;
    }
}

export async function updateUserProfile(input: UpdateUserProfileInput) {
    const session = await getSession();
    if (!session || !session.userId) {
        return { success: false, error: 'Unauthorized' };
    }

    const userId = session.userId as string;

    const parsed = updateUserProfileSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid profile data' };
    }
    const data = parsed.data;

    /* A college admin's authority over a college page comes from their
       collegeId (see updateCollegeAction), so letting them change it here
       would let them adopt, and then edit, any college on the site. */
    const changesCollege = (data.collegeId !== undefined || data.customCollegeName !== undefined)
        && data.collegeId !== session.user?.collegeId;
    if (changesCollege && session.user?.role === 'COLLEGE_ADMIN') {
        return { success: false, error: 'College admins cannot change their college. Ask a site admin.' };
    }

    try {
        // OPTIMIZATION: Use a single transaction for all updates
        await prisma.$transaction(async (tx) => {
            // 0. Handle Custom College Creation
            let finalCollegeId = data.collegeId;

            if (data.customCollegeName && (!data.collegeId || data.collegeId === 'other')) {
                // New colleges go live immediately, so bound how fast anyone
                // can add them (a script could otherwise fill /colleges).
                const limit = await checkRateLimit(eventLimiter, `${getRateLimitIdentifier(userId)}:new-college`);
                if (!limit.success) throw new Error('RATE_LIMITED');
                const normalizedName = data.customCollegeName.trim();
                const existing = await tx.college.findFirst({
                    where: { name: normalizedName }
                });

                if (existing) {
                    finalCollegeId = existing.id;
                } else {
                    const newCollege = await tx.college.create({
                        data: {
                            name: normalizedName,
                            location: 'Unspecified',
                            description: `Community added college: ${normalizedName}`,
                            logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(normalizedName)}&background=random`
                        }
                    });
                    finalCollegeId = newCollege.id;
                }
            }

            // 1. Separate scalar updates and relation updates
            const { skills, interests, achievements, projects, portfolioLinks } = data;

            // 2. Build the update field by field. Never spread the input here:
            //    that is how role, email and password used to get through.
            const updateData: Prisma.UserUpdateInput = {};
            if (data.name !== undefined) updateData.name = data.name;
            if (data.bio !== undefined) updateData.bio = data.bio;
            if (data.department !== undefined) updateData.department = data.department;
            if (data.year !== undefined) updateData.year = data.year;
            if (data.avatar !== undefined) updateData.avatar = data.avatar;
            if (data.resumeUrl !== undefined) updateData.resumeUrl = data.resumeUrl;
            if (achievements) updateData.achievements = JSON.stringify(achievements);
            if (projects) updateData.projects = JSON.stringify(projects);
            if (portfolioLinks) updateData.portfolioLinks = JSON.stringify(portfolioLinks);
            if (finalCollegeId && finalCollegeId !== 'other') {
                updateData.college = { connect: { id: finalCollegeId } };
            }

            // 3. Handle skills - clear and set in one update
            if (skills !== undefined) {
                updateData.skills = {
                    set: [], // Clear existing
                };
            }

            // 4. Handle interests - clear and set in one update
            if (interests !== undefined) {
                updateData.interests = {
                    set: [], // Clear existing
                };
            }

            // First update: Clear relations and set scalar data
            if (Object.keys(updateData).length > 0) {
                await tx.user.update({
                    where: { id: userId },
                    data: updateData
                });
            }

            // Second update: Connect skills and interests (if provided)
            const connectData: Prisma.UserUpdateInput = {};

            if (skills && skills.length > 0) {
                connectData.skills = {
                    connectOrCreate: skills.map(s => ({
                        where: { name: s },
                        create: { name: s }
                    }))
                };
            }

            if (interests && interests.length > 0) {
                connectData.interests = {
                    connectOrCreate: interests.map(i => ({
                        where: { name: i },
                        create: { name: i }
                    }))
                };
            }

            if (Object.keys(connectData).length > 0) {
                await tx.user.update({
                    where: { id: userId },
                    data: connectData
                });
            }
        });

        revalidatePath('/profile');
        // The public profile page is cached per user.
        updateTag(`user-${userId}`);
        return { success: true };

    } catch (error) {
        if (error instanceof Error && error.message === 'RATE_LIMITED') {
            return { success: false, error: 'Too many new colleges added. Try again later.' };
        }
        console.error('Failed to update profile:', error);
        return { success: false, error: 'Failed to update profile' };
    }
}

// Moving this here as it updates user relations
export async function toggleCollegeFollow(collegeId: string) {
    // The follower is always the signed-in user. This used to take a userId
    // argument and trust it, so anyone could change anyone's follows.
    const session = await getSession();
    if (!session || !session.userId) {
        throw new Error('Unauthorized');
    }
    const userId = session.userId as string;

    try {
        const existingFollow = await prisma.user.findFirst({
            where: {
                id: userId,
                followedColleges: {
                    some: {
                        id: collegeId
                    }
                }
            }
        });

        if (existingFollow) {
            // Unfollow
            await prisma.user.update({
                where: { id: userId },
                data: {
                    followedColleges: {
                        disconnect: { id: collegeId }
                    }
                }
            });
            return { action: 'unfollowed' };
        } else {
            // Follow
            await prisma.user.update({
                where: { id: userId },
                data: {
                    followedColleges: {
                        connect: { id: collegeId }
                    }
                }
            });
            return { action: 'followed' };
        }
    } catch (error) {
        console.error('Failed to toggle college follow:', error);
        throw new Error('Failed to update follow status');
    }
}

