'use server';

import prisma from '@/lib/db';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { createSession, deleteSession, getSession } from '@/lib/auth';
import { ActionState } from '@/types';
import { authLimiter, signupLimiter, getRateLimitIdentifier, checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export async function signup(prevState: ActionState | null, formData: FormData): Promise<ActionState> {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const department = (formData.get('department') as string) || 'General';
    const year = (formData.get('year') as string) || '1st Year';

    if (!email || !password || !name) {
        return { success: false, error: 'Missing required fields' };
    }

    try {
        // Rate limiting: 3 signups per hour per IP/email
        const identifier = getRateLimitIdentifier(undefined, email);
        const rateLimit = await checkRateLimit(signupLimiter, identifier);

        if (!rateLimit.success) {
            const resetTime = rateLimit.reset.toLocaleTimeString();
            return {
                success: false,
                error: `Too many signup attempts. Please try again at ${resetTime}.`
            };
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
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
        });

        logger.auth('signup', newUser.id, { email, department, year, collegeId: defaultCollege.id });

        return { success: true, message: 'Account created successfully' };

    } catch (error) {
        logger.error('Signup failed', error as Error, { email });
        console.error('Signup error details:', error);
        return { success: false, error: 'Failed to create account. Please try again.' };
    }
}

export async function login(prevState: ActionState | null, formData: FormData): Promise<ActionState> {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    console.log('[LOGIN] Starting login for:', email);

    if (!email || !password) {
        console.log('[LOGIN] Missing credentials');
        return { success: false, error: 'Missing email or password' };
    }

    try {
        // Rate limiting: 5 attempts per 15 minutes per email
        const identifier = getRateLimitIdentifier(undefined, email);
        const rateLimit = await checkRateLimit(authLimiter, identifier);

        if (!rateLimit.success) {
            logger.rateLimit('login', identifier, true, { email });
            const resetTime = rateLimit.reset.toLocaleTimeString();
            return {
                success: false,
                error: `Too many login attempts. Please try again at ${resetTime}.`
            };
        }

        console.log('[LOGIN] Finding user...');
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) {
            console.log('[LOGIN] User not found or no password');
            return { success: false, error: 'Invalid credentials' };
        }

        // Check if account is locked
        if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
            const lockRemaining = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
            logger.auth('login_blocked', user.id, { email, reason: 'account_locked' });
            return {
                success: false,
                error: `Account locked. Please try again in ${lockRemaining} minute(s).`
            };
        }

        console.log('[LOGIN] User found:', user.id);
        console.log('[LOGIN] Comparing password...');
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            console.log('[LOGIN] Password mismatch');

            // Track failed attempt using LoginAttempt model
            const recentFailures = await prisma.loginAttempt.count({
                where: {
                    email,
                    success: false,
                    createdAt: {
                        gte: new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
                    }
                }
            });

            // Record this failed attempt
            await prisma.loginAttempt.create({
                data: {
                    id: crypto.randomUUID(),
                    email,
                    success: false,
                    createdAt: new Date()
                }
            });

            // Lock account after 5 failed attempts in 15 minutes
            const LOCKOUT_THRESHOLD = 5;
            const LOCKOUT_DURATION_MINUTES = 15;

            if (recentFailures + 1 >= LOCKOUT_THRESHOLD) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
                    }
                });
                logger.auth('account_locked', user.id, { email, failedAttempts: recentFailures + 1 });
                return {
                    success: false,
                    error: `Too many failed attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes.`
                };
            }

            logger.auth('failed', user.id, { email, reason: 'invalid_password', failedAttempts: recentFailures + 1 });
            return { success: false, error: 'Invalid credentials' };
        }

        // Clear any existing lock on successful login
        if (user.lockedUntil) {
            await prisma.user.update({
                where: { id: user.id },
                data: { lockedUntil: null }
            });
        }

        console.log('[LOGIN] Password matched! Creating session...');
        await createSession(user.id, {
            role: user.role,
            name: user.name,
            email: user.email,
        });
        console.log('[LOGIN] Session created successfully!');

        logger.auth('login', user.id, { email });

        return { success: true, message: 'Logged in successfully' };

    } catch (error) {
        console.error('[LOGIN] ERROR:', error);
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

export async function updateUserProfile(data: {
    name?: string;
    department?: string;
    year?: string;
    bio?: string;
    avatar?: string;
    resumeUrl?: string;
    skills?: string[];
    interests?: string[];
    achievements?: any[];
    projects?: any[];
    portfolioLinks?: any[];
    collegeId?: string;
    customCollegeName?: string;
}) {
    const session = await getSession();
    if (!session || !session.userId) {
        return { success: false, error: 'Unauthorized' };
    }

    const userId = session.userId as string;

    try {
        // OPTIMIZATION: Use a single transaction for all updates
        await prisma.$transaction(async (tx) => {
            // 0. Handle Custom College Creation
            let finalCollegeId = data.collegeId;

            if (data.customCollegeName && (!data.collegeId || data.collegeId === 'other')) {
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
            const { skills, interests, achievements, projects, portfolioLinks, collegeId, customCollegeName, ...scalarData } = data;

            // 2. Build the complete update object
            const updateData: any = { ...scalarData };
            if (achievements) updateData.achievements = JSON.stringify(achievements);
            if (projects) updateData.projects = JSON.stringify(projects);
            if (portfolioLinks) updateData.portfolioLinks = JSON.stringify(portfolioLinks);
            if (finalCollegeId) updateData.collegeId = finalCollegeId;

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
            const connectData: any = {};

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
        return { success: true };

    } catch (error) {
        console.error('Failed to update profile:', error);
        return { success: false, error: 'Failed to update profile' };
    }
}

// Moving this here as it updates user relations
export async function toggleCollegeFollow(userId: string, collegeId: string) {
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

export async function getLeaderboard() {
    try {
        const users = await prisma.user.findMany({
            include: {
                badges: {
                    include: { badge: true }
                },
                _count: {
                    select: { registrations: true }
                }
            },
            take: 20
        });

        // Calculate scores
        const rankedUsers = users.map(user => {
            const badgePoints = user.badges.length * 100;
            const eventPoints = user._count.registrations * 10;
            const points = badgePoints + eventPoints;

            return {
                id: user.id,
                name: user.name,
                avatar: user.name.charAt(0).toUpperCase(), // Simple avatar
                department: user.department,
                points,
                badges: user.badges.map(ub => {
                    let earnedDate;
                    try {
                        earnedDate = ub.dateEarned.toISOString();
                    } catch (e) {
                        earnedDate = new Date().toISOString();
                    }
                    return {
                        ...ub.badge,
                        dateEarned: earnedDate
                    };
                })
            };
        });

        // Sort by points desc
        return rankedUsers.sort((a, b) => b.points - a.points);
    } catch (error) {
        console.error("Failed to fetch leaderboard:", error);
        return [];
    }
}
